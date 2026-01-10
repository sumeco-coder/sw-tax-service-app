// app
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { configureAmplify } from "@/lib/amplifyClient";
import {
  signIn,
  signOut,
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
} from "aws-amplify/auth";

// If you want to allow ANY email as admin (not recommended), set this to "".
const ADMIN_EMAIL_DOMAIN = "swtaxservice.com";
const MIN_ADMIN_PASSWORD_LEN = 8;
const MAX_ADMIN_PASSWORD_LEN = 20;

type Phase =
  | "checking"
  | "signin"
  | "new-password"
  | "mfa-email"
  | "mfa-totp"
  | "setup-email"
  | "setup-totp"
  | "done";

function normalizeUsername(email: string) {
  return email.trim().toLowerCase();
}

function emailDomain(email: string) {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function isAdminFromPayload(payload: any) {
  const role = payload?.["custom:role"];
  const groups: string[] = payload?.["cognito:groups"] ?? [];
  return role === "admin" || groups.includes("admin");
}

function friendlyError(err: any) {
  const msg = String(err?.message ?? "Sign-in failed.");
  if (msg.includes("Incorrect username or password"))
    return "Invalid email or password.";
  if (msg.includes("User does not exist"))
    return "No account found for that email.";
  if (msg.includes("User is disabled")) return "This account is disabled.";
  if (
    msg.includes("Too many failed attempts") ||
    msg.includes("Attempt limit exceeded")
  )
    return "Too many attempts. Try again later.";
  if (msg.toLowerCase().includes("network"))
    return "Network error. Check your connection and try again.";
  return msg;
}

async function syncServerCookiesFromSession() {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString() ?? "";
  const idToken = session.tokens?.idToken?.toString() ?? "";

  if (!accessToken || !idToken) return null;

  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, idToken }),
  });

  return session;
}

async function hardSignOut() {
  try {
    await signOut();
  } catch {}

  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {}

  try {
    await signOut({ global: true });
  } catch {}

  await new Promise((r) => setTimeout(r, 150));
}

export default function SignInAdmin() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // MFA / setup code input
  const [code, setCode] = useState("");

  // NEW_PASSWORD_REQUIRED
  const [newPassword, setNewPassword] = useState("");

  const [totpUri, setTotpUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    configureAmplify();
  }, []);

  const username = useMemo(() => normalizeUsername(email), [email]);

  const canSubmit = useMemo(() => !loading, [loading]);

  const domainOk = useMemo(() => {
    if (!ADMIN_EMAIL_DOMAIN) return true;
    if (!username.includes("@")) return true; // don't block while typing
    return emailDomain(username) === ADMIN_EMAIL_DOMAIN;
  }, [username]);

  const canSignIn = useMemo(
    () => username.includes("@") && password.length > 0 && domainOk,
    [username, password, domainOk]
  );

  const canSetNewPassword = useMemo(
    () =>
      username.includes("@") &&
      newPassword.length >= MIN_ADMIN_PASSWORD_LEN &&
      newPassword.length <= MAX_ADMIN_PASSWORD_LEN,
    [username, newPassword]
  );

  const redirectNotAuthorized = useCallback(
    async (message?: string) => {
      if (message) setMsg(message);
      await hardSignOut();
      router.replace("/not-authorized?reason=admin_only");
    },
    [router]
  );

  const finishAdminLogin = useCallback(async () => {
    const session = await syncServerCookiesFromSession();
    const payload: any = session?.tokens?.idToken?.payload ?? {};

    if (!session) {
      await hardSignOut();
      setMsg("Session missing. Please sign in again.");
      setPhase("signin");
      return;
    }

    if (!isAdminFromPayload(payload)) {
      await redirectNotAuthorized(
        "This account isn’t an admin. Use Client sign-in instead."
      );
      return;
    }

    setPhase("done");
    setMsg("Signed in. Redirecting…");
    router.replace("/admin");
    router.refresh();
  }, [router, redirectNotAuthorized]);

  const applyNextStep = useCallback(
    async (nextStep: any) => {
      const step = nextStep?.signInStep;

      // Choice-based sign-in: pick EMAIL_OTP as factor
      if (step === "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION") {
        const { nextStep: ns } = await confirmSignIn({
          challengeResponse: "EMAIL_OTP" as any,
        });
        return applyNextStep(ns);
      }

      // NEW PASSWORD REQUIRED
      if (step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        setPhase("new-password");
        setMsg(
          "A new password is required for this admin account. Set a new password to continue."
        );
        return;
      }

      if (step === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE") {
        setPhase("mfa-email");
        setMsg("Enter the code sent to your email.");
        return;
      }

      if (step === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") {
        setPhase("mfa-totp");
        setMsg("Enter the 6-digit code from your authenticator app.");
        return;
      }

      if (step === "CONTINUE_SIGN_IN_WITH_EMAIL_SETUP") {
        setPhase("setup-email");
        setMsg("Enter the email address to receive one-time codes.");
        return;
      }

      if (step === "CONTINUE_SIGN_IN_WITH_TOTP_SETUP") {
        const uri =
          (nextStep as any)?.totpSetupDetails?.getSetupUri?.() ?? null;
        if (uri) setTotpUri(uri);
        setPhase("setup-totp");
        setMsg("Scan the QR / use the key, then enter a 6-digit code.");
        return;
      }

      if (step === "DONE") {
        await finishAdminLogin();
        return;
      }

      setMsg(
        step ? `Additional step required: ${step}` : "Sign-in incomplete."
      );
    },
    [finishAdminLogin]
  );

  // On load: if already signed in, validate admin and redirect
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setPhase("checking");
      try {
        await getCurrentUser();
        const session = await syncServerCookiesFromSession();
        const payload: any = session?.tokens?.idToken?.payload ?? {};

        if (cancelled) return;

        if (session && isAdminFromPayload(payload)) {
          router.replace("/admin");
          router.refresh();
          return;
        }

        // Signed in but not admin -> boot them
        if (session && !isAdminFromPayload(payload)) {
          await redirectNotAuthorized(
            "This account isn’t an admin. Use Client sign-in instead."
          );
          return;
        }

        await hardSignOut();
      } catch {
        // not signed in
      } finally {
        if (!cancelled) setPhase("signin");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, redirectNotAuthorized]);

  const handleSignIn = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");

      if (!domainOk) {
        setMsg(`Admin sign-in is limited to @${ADMIN_EMAIL_DOMAIN} accounts.`);
        return;
      }

      setLoading(true);
      try {
        await hardSignOut();

        const { nextStep } = await signIn({
          username,
          password,
        });

        await applyNextStep(nextStep);
      } catch (err: any) {
        setMsg(friendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [domainOk, username, password, applyNextStep]
  );

  const handleConfirm = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);

      try {
        const challengeResponse =
          phase === "setup-email"
            ? username
            : phase === "new-password"
              ? newPassword
              : code.trim();

        const { nextStep } = await confirmSignIn({ challengeResponse });

        await applyNextStep(nextStep);
      } catch (err: any) {
        setMsg(friendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [phase, code, username, newPassword, applyNextStep]
  );

  const resetToSignin = useCallback(() => {
    setPhase("signin");
    setCode("");
    setTotpUri(null);
    setNewPassword("");
    setMsg("");
  }, []);

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            SW Tax Service • Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Admin Sign In
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            This area is restricted to authorized admins.
          </p>
        </div>

        {msg ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {msg}
          </div>
        ) : null}

        {phase === "checking" && (
          <div className="rounded-xl border bg-slate-50 px-3 py-3 text-sm text-slate-700">
            Checking session…
          </div>
        )}

        {phase === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                inputMode="email"
                required
              />
              {!domainOk ? (
                <p className="mt-1 text-xs text-amber-700">
                  Admin sign-in is limited to{" "}
                  <span className="font-medium">@{ADMIN_EMAIL_DOMAIN}</span>.
                </p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Password
              </span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/admin/forgot-password"
                className="text-slate-600 hover:underline"
              >
                Forgot your password?
              </Link>
              <Link href="/sign-in" className="text-slate-600 hover:underline">
                Client sign-in
              </Link>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || !canSignIn}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                await hardSignOut();
                router.refresh();
                setLoading(false);
                setMsg("Signed out.");
              }}
              disabled={!canSubmit}
              className="w-full rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Force sign out
            </button>
          </form>
        )}

        {phase === "new-password" && (
          <form onSubmit={handleConfirm} className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              A new password is required for this admin account.
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-slate-50"
                value={email}
                readOnly
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                New password
              </span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value.slice(0, MAX_ADMIN_PASSWORD_LEN)
                  )
                }
                minLength={MIN_ADMIN_PASSWORD_LEN}
                maxLength={MAX_ADMIN_PASSWORD_LEN}
                autoComplete="new-password"
                required
              />

              <p className="mt-1 text-xs text-slate-500">
                Use {MIN_ADMIN_PASSWORD_LEN}–{MAX_ADMIN_PASSWORD_LEN}{" "}
                characters. Your pool may require upper/lowercase, number, and
                symbol.
              </p>
            </label>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={resetToSignin}
                className="text-slate-600 hover:underline"
                disabled={loading}
              >
                Back
              </button>

              <Link
                href="/admin/forgot-password"
                className="text-slate-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || !canSetNewPassword}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Updating..." : "Set new password & continue"}
            </button>
          </form>
        )}

        {(phase === "mfa-email" || phase === "mfa-totp") && (
          <form onSubmit={handleConfirm} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {phase === "mfa-email" ? "Email code" : "Authenticator code"}
              </span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Confirming..." : "Confirm"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={resetToSignin}
                className="font-semibold text-slate-700 hover:underline"
                disabled={loading}
              >
                Back
              </button>

              <Link
                href="/admin/forgot-password"
                className="text-slate-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        )}

        {(phase === "setup-email" || phase === "setup-totp") && (
          <form onSubmit={handleConfirm} className="space-y-3">
            {phase === "setup-totp" && totpUri ? (
              <div className="text-xs p-3 rounded bg-slate-50 break-all border">
                <div className="font-medium mb-1">Provisioning URI</div>
                <div>{totpUri}</div>
              </div>
            ) : null}

            {phase === "setup-email" ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Email for codes
                </span>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  required
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  6-digit code
                </span>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </label>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Continuing..." : "Continue"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={resetToSignin}
                className="font-semibold text-slate-700 hover:underline"
                disabled={loading}
              >
                Back
              </button>

              <Link
                href="/admin/forgot-password"
                className="text-slate-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        )}

        {phase === "done" && (
          <div className="mt-2 rounded-xl border bg-green-50 px-3 py-3 text-sm text-green-800">
            Signed in successfully. Redirecting…
          </div>
        )}

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/sign-in" className="text-slate-600 hover:underline">
            Client sign-in
          </Link>
          <Link href="/" className="text-slate-600 hover:underline">
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
