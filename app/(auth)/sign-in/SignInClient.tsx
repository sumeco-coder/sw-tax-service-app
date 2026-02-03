// app/(auth)/sign-in/SigninClient.tsx
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { decodeJwt } from "jose";

import {
  signIn,
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
  getCurrentUser,
  signOut,
  fetchAuthSession,
} from "aws-amplify/auth";

import { configureAmplify } from "@/lib/amplifyClient";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Eye, EyeOff } from "lucide-react";

const isDev = process.env.NODE_ENV !== "production";

const BRAND = {
  pink: "#E62A68",
  copper: "#BB4E2B",
  charcoal: "#2C2B32",
  charcoal2: "#1B1A1F",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

type View =
  | "signin"
  | "confirmSignIn"
  | "confirmSignUp"
  | "newPassword"
  | "setpw"
  | "forgot";

function cleanEmail(v: string) {
  return String(v ?? "").trim().toLowerCase();
}

function getErrMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as any).message;
    if (typeof msg === "string") return msg;
  }
  return "Something went wrong. Please try again.";
}

/** Only allow internal app paths to avoid open-redirect attacks */
function safeInternalPath(input: string | null, fallback: string) {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  return raw;
}

/** ✅ next means "after onboarding" — never allow onboarding routes as final target */
function normalizePostOnboardingTarget(path: string) {
  if (path.startsWith("/onboarding")) return "/dashboard";
  return path;
}

async function syncServerCookiesFromSession(): Promise<boolean> {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString() ?? "";
  const idToken = session.tokens?.idToken?.toString() ?? "";
  if (!accessToken || !idToken) return false;

  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ accessToken, idToken }),
    cache: "no-store",
  }).catch(() => null);

  return !!res && res.ok;
}

export default function SigninClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // query params
  const start = useMemo(
    () => (searchParams.get("start") ?? "").trim().toLowerCase(),
    [searchParams],
  );

  const invite = useMemo(
    () => (searchParams.get("invite") ?? "").trim(),
    [searchParams],
  );

  const nextParam = useMemo(
    () => searchParams.get("next") ?? searchParams.get("redirect"),
    [searchParams],
  );

  const reason = useMemo(
    () => (searchParams.get("reason") ?? "").trim(),
    [searchParams],
  );

  const emailParam = useMemo(
    () => (searchParams.get("email") ?? "").trim(),
    [searchParams],
  );

  const emailLocked = !!emailParam;

  // state
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [view, setView] = useState<View>(() =>
    start === "setpw" ? "setpw" : "signin",
  );

  const [email, setEmail] = useState(() => emailParam || "");
  const [password, setPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [checkingSession, setCheckingSession] = useState(true);

  // amplify init
  useEffect(() => {
    configureAmplify();
  }, []);

  // keep email in sync if param provided
  useEffect(() => {
    if (!emailParam) return;
    setEmail((prev) => (prev ? prev : emailParam));
  }, [emailParam]);

  const username = useMemo(() => cleanEmail(email), [email]);

  // ✅ Destination AFTER onboarding complete
  const intendedAfterOnboarding = useMemo(() => {
    const safe = safeInternalPath(nextParam, "/dashboard");
    return normalizePostOnboardingTarget(safe);
  }, [nextParam]);

  /** ✅ Invite users should NOT go to /taxpayer/onboarding-sign-up */
  const createAccountHref = useMemo(() => {
    const params = new URLSearchParams();

    if (invite) {
      params.set("start", "setpw");
      params.set("invite", invite);
      if (emailParam || email) params.set("email", cleanEmail(emailParam || email));
      if (intendedAfterOnboarding) params.set("next", intendedAfterOnboarding);
      const qs = params.toString();
      return `/sign-in${qs ? `?${qs}` : ""}`;
    }

    if (intendedAfterOnboarding) params.set("next", intendedAfterOnboarding);
    const qs = params.toString();
    return `/sign-up${qs ? `?${qs}` : ""}`;
  }, [invite, intendedAfterOnboarding, emailParam, email]);

  function resetSensitiveFields() {
    setPassword("");
    setCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPassword(false);
    setShowNewPassword(false);
  }

  function backToSignIn() {
    setView("signin");
    setMsg("");
    resetSensitiveFields();
  }

  // ✅ If start=setpw, force set-password view every time
  useEffect(() => {
  if (start === "setpw") {
    setView("setpw");
    setMsg("Your portal is ready. Create your password below to activate your access.");
    return;
  }

  // ✅ temp password invite flow (Choice B)
  if (start === "temp") {
    setView("signin");
    setMsg("Use the temporary password from your email. You’ll be prompted to create a new password after signing in.");
    return;
  }
}, [start]);


  /** ✅ Force onboarding for taxpayers (or invite flow) until onboardingComplete=true */
  async function routeAfterAuth() {
    const intended = intendedAfterOnboarding || "/dashboard";

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString() ?? "";

      if (idToken) {
        const payload = decodeJwt(idToken) as Record<string, any>;
        const roleClaim = String(payload["custom:role"] ?? "").toLowerCase();
        const onboardingComplete =
          String(payload["custom:onboardingComplete"] ?? "").toLowerCase() === "true";

        if ((invite || roleClaim === "taxpayer") && !onboardingComplete) {
          router.push(`/onboarding/profile?next=${encodeURIComponent(intended)}`);
          return;
        }
      }
    } catch (e) {
      console.error("routeAfterAuth token check failed:", e);
    }

    router.push(intended);
  }

  // ✅ If already signed in, redirect right away
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await getCurrentUser();
        if (cancelled) return;

        const ok = await syncServerCookiesFromSession();
        if (!ok) {
          setMsg("Session sync failed. Please refresh and sign in again.");
          await signOut().catch(() => {});
          return;
        }

        await routeAfterAuth();
      } catch {
        // not signed in -> show UI
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invite, intendedAfterOnboarding]);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!username) return setMsg("Please enter your email.");
    if (!password) return setMsg("Please enter your password.");

    setLoading(true);
    try {
      const res = await signIn({ username, password });

      if (res.isSignedIn) {
        const ok = await syncServerCookiesFromSession();
        if (!ok) {
          setMsg("Session sync failed. Please refresh and sign in again.");
          await signOut().catch(() => {});
          return;
        }
        await routeAfterAuth();
        return;
      }

      const step = res.nextStep?.signInStep;

      if (step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        setView("newPassword");
        setMsg("For security, you need to create a new password to finish signing in.");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowNewPassword(false);
        return;
      }

      if (
        step === "CONFIRM_SIGN_IN_WITH_SMS_CODE" ||
        step === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE" ||
        step === "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
      ) {
        setView("confirmSignIn");
        setMsg("Enter the verification code you received.");
        return;
      }

      if (step === "CONFIRM_SIGN_UP") {
        setView("confirmSignUp");
        setMsg("Your account isn’t confirmed yet. Enter your confirmation code.");
        return;
      }

      setView("forgot");
      setMsg("We need one more step to sign you in. Please reset your password to continue.");
    } catch (e: unknown) {
      const m = getErrMsg(e);

      if (m.toLowerCase().includes("already a signed in user")) {
        const ok = await syncServerCookiesFromSession();
        if (!ok) return setMsg("Session sync failed. Please refresh and try again.");
        await routeAfterAuth();
        return;
      }

      setMsg(m);
    } finally {
      setLoading(false);
    }
  }

  async function hardSignOutToSwitchAccount() {
    try {
      await signOut({ global: true });
    } finally {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" }).catch(() => {});
      window.location.href = "/sign-in";
    }
  }

  async function handleConfirmSignIn(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await confirmSignIn({ challengeResponse: code.trim() });
      if (res.isSignedIn) {
        await syncServerCookiesFromSession();
        await routeAfterAuth();
        return;
      }
      setMsg("Not signed in yet. Please try again.");
    } catch (e: unknown) {
      setMsg(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSetNewPassword(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (newPassword.length < 8) return setMsg("Password must be at least 8 characters.");
    if (newPassword !== confirmNewPassword) return setMsg("Passwords do not match.");

    setLoading(true);
    try {
      const res = await confirmSignIn({ challengeResponse: newPassword });

      if (res.isSignedIn) {
        const ok = await syncServerCookiesFromSession();
        if (!ok) {
          setMsg("Session sync failed. Please refresh and sign in again.");
          await signOut().catch(() => {});
          return;
        }
        await routeAfterAuth();
        return;
      }

      const step = res.nextStep?.signInStep;
      if (
        step === "CONFIRM_SIGN_IN_WITH_SMS_CODE" ||
        step === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE" ||
        step === "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
      ) {
        setView("confirmSignIn");
        setMsg("Enter the verification code you received.");
        return;
      }

      setMsg("Please complete the next sign-in step.");
    } catch (e: unknown) {
      setMsg(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  }

  // ✅ Branded invite: set password without temp password
  async function handleSetPasswordFromInvite(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!invite) return setMsg("Missing invite token. Please use the link from your email.");
    if (!username) return setMsg("Please enter your email.");
    if (newPassword.length < 8) return setMsg("Password must be at least 8 characters.");
    if (newPassword !== confirmNewPassword) return setMsg("Passwords do not match.");

    setLoading(true);
    try {
      const r = await fetch("/api/auth/invite/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          invite,
          email: username,
          newPassword,
        }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok || !data?.ok) {
        setMsg(String(data?.error ?? "Could not set password. Please request a new invite."));
        return;
      }

      // sign in with the password they just created
      const res = await signIn({ username, password: newPassword });

      if (res.isSignedIn) {
        const ok = await syncServerCookiesFromSession();
        if (!ok) {
          setMsg("Session sync failed. Please refresh and sign in again.");
          await signOut().catch(() => {});
          return;
        }
        await routeAfterAuth();
        return;
      }

      // rare edge
      setMsg("Password created. Please sign in.");
      setView("signin");
      setPassword("");
    } catch (e: unknown) {
      setMsg(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSignUp(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!username) return setMsg("Enter your email above first, then your confirmation code.");

    setLoading(true);
    try {
      await confirmSignUp({ username, confirmationCode: code.trim() });
      setMsg("Confirmed! Please sign in.");
      setCode("");
      setView("signin");
    } catch (e: unknown) {
      setMsg(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendSignUpCode() {
    setMsg("");

    if (!username) return setMsg("Enter your email above first, then click resend.");

    setLoading(true);
    try {
      await resendSignUpCode({ username });
      setMsg("A new confirmation code has been sent.");
    } catch (e: unknown) {
      setMsg(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-gray-700">
          Checking session…
        </div>
      </div>
    );
  }

  const title =
    view === "setpw"
      ? "Create your password"
      : view === "signin"
        ? invite
          ? "Sign in to continue onboarding"
          : "Sign in"
        : view === "newPassword"
          ? "Create your password"
          : "Account access";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `radial-gradient(1200px 700px at 15% 0%, rgba(230,42,104,0.18), transparent 60%),
                 radial-gradient(900px 600px at 85% 15%, rgba(187,78,43,0.14), transparent 55%),
                 linear-gradient(135deg, ${BRAND.charcoal2}, ${BRAND.charcoal})`,
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-2xl p-[2px]" style={brandGradient}>
            <div className="relative h-full w-full rounded-[14px] bg-white">
              <Image
                src="/swtax-favicon-pack/favicon-48x48.png"
                alt="SW Tax Service"
                fill
                className="object-contain p-1.5"
                priority
              />
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900">SW Tax Service</div>
            <div className="text-[11px] text-slate-500">Secure client portal</div>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-extrabold text-slate-900 text-center">{title}</h1>
        <div className="mt-3 h-1 w-24 mx-auto rounded-full" style={brandGradient} />

        {reason === "timeout" && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            You were signed out due to inactivity. Please sign in again.
          </div>
        )}

        {/* ✅ SET PASSWORD (BRANDED INVITE) */}
        {view === "setpw" && (
          <form onSubmit={handleSetPasswordFromInvite} className="mt-6 space-y-4">
            <div className="text-sm text-slate-700">
              Your portal is ready. Create your password below.
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-600"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={emailLocked}
                required
              />
              {emailLocked && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Email is locked to the address that received this invite.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">New password</label>

              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <p className="mt-1 text-[11px] text-slate-500">
                Use 8+ characters. Add a number or symbol for stronger security.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Confirm new password
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5"
                type={showNewPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-white font-semibold shadow-sm transition disabled:opacity-60"
              style={brandGradient}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Password & Continue"}
            </button>

            <button
              type="button"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 hover:bg-slate-50"
              disabled={loading}
              onClick={backToSignIn}
            >
              Back to sign in
            </button>
          </form>
        )}

        {/* ✅ SIGN IN */}
        {view === "signin" && (
          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.02)" }}
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Password</label>

              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 text-white font-semibold shadow-sm transition
             cursor-pointer disabled:cursor-not-allowed disabled:opacity-60
             hover:brightness-110 active:brightness-95"
              style={brandGradient}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {isDev && (
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setMsg("");
                  setLoading(true);
                  await hardSignOutToSwitchAccount();
                }}
                className="w-full rounded-xl border border-black/10 bg-white py-2.5 text-sm text-black
               hover:bg-black/5 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Switch account (sign out)
              </button>
            )}

            <div className="flex items-center justify-end text-sm">
              <button
                type="button"
                className="font-medium text-slate-700 hover:text-slate-900 underline-offset-4 hover:underline cursor-pointer"
                onClick={() => {
                  setMsg("");
                  setView("forgot");
                }}
              >
                Forgot password?
              </button>
            </div>

            <div className="pt-1 text-center text-sm text-slate-700">
              {invite ? (
                <>
                  Need to activate your invite?{" "}
                  <Link
                    href={createAccountHref}
                    className="font-semibold underline underline-offset-4 hover:text-slate-900"
                  >
                    Set your password
                  </Link>
                </>
              ) : (
                <>
                  New here?{" "}
                  <Link
                    href={createAccountHref}
                    className="font-semibold underline underline-offset-4 hover:text-slate-900"
                  >
                    Create an account
                  </Link>
                </>
              )}
            </div>
          </form>
        )}

        {/* CONFIRM SIGN IN */}
        {view === "confirmSignIn" && (
          <form onSubmit={handleConfirmSignIn} className="mt-6 space-y-4">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
              placeholder="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
            />

            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-white font-semibold shadow-sm transition hover:opacity-95 disabled:opacity-60"
              style={brandGradient}
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm"}
            </button>

            <button
              type="button"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              disabled={loading}
              onClick={backToSignIn}
            >
              Back to sign in
            </button>
          </form>
        )}

        {/* NEW PASSWORD REQUIRED */}
        {view === "newPassword" && (
          <form onSubmit={handleSetNewPassword} className="mt-6 space-y-4">
            <div className="text-sm text-slate-700">Create a new password to finish signing in.</div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">New password</label>

              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Confirm new password
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5"
                type={showNewPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-white font-semibold shadow-sm transition disabled:opacity-60"
              style={brandGradient}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save new password"}
            </button>

            <button
              type="button"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 hover:bg-slate-50"
              disabled={loading}
              onClick={backToSignIn}
            >
              Back to sign in
            </button>
          </form>
        )}

        {/* CONFIRM SIGN UP */}
        {view === "confirmSignUp" && (
          <form onSubmit={handleConfirmSignUp} className="mt-6 space-y-4">
            <div className="text-sm text-slate-700">
              Your account isn’t confirmed yet. Enter the confirmation code sent to your email.
            </div>

            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
              placeholder="Confirmation code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
            />

            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-white font-semibold shadow-sm transition hover:opacity-95 disabled:opacity-60"
              style={brandGradient}
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm account"}
            </button>

            <button
              type="button"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              disabled={loading}
              onClick={handleResendSignUpCode}
            >
              {loading ? "Sending..." : "Resend code"}
            </button>

            <button
              type="button"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              disabled={loading}
              onClick={backToSignIn}
            >
              Back to sign in
            </button>
          </form>
        )}

        {/* FORGOT */}
        {view === "forgot" && (
          <div className="mt-6">
            <ForgotPasswordForm initialEmail={email} onBack={backToSignIn} onDone={backToSignIn} />
          </div>
        )}

        {msg && <div className="mt-4 text-sm text-slate-700">{msg}</div>}
      </div>
    </div>
  );
}
