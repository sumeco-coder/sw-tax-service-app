// app/(admin)/admin/sign-in/SignInAdmin.tsx
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

configureAmplify();

type Phase =
  | "checking"
  | "signin"
  | "mfa-email"
  | "mfa-totp"
  | "setup-email"
  | "setup-totp"
  | "done";

function normalizeUsername(email: string) {
  return email.trim().toLowerCase();
}

function isAdminFromPayload(payload: any) {
  const role = payload?.["custom:role"];
  const groups: string[] = payload?.["cognito:groups"] ?? [];
  return role === "admin" || groups.includes("admin");
}

function friendlyError(err: any) {
  const msg = String(err?.message ?? "Sign-in failed.");
  if (msg.includes("Incorrect username or password")) return "Invalid email or password.";
  if (msg.includes("User does not exist")) return "No account found for that email.";
  if (msg.includes("User is disabled")) return "This account is disabled.";
  if (msg.includes("Too many failed attempts")) return "Too many attempts. Try again later.";
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
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const canSubmit = useMemo(() => !loading, [loading]);

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
      await hardSignOut();
      router.replace("/not-authorized");
      return;
    }

    setPhase("done");
    setMsg("Signed in. Redirecting…");
    router.replace("/admin");
    router.refresh();
  }, [router]);

  const applyNextStep = useCallback(
    async (nextStep: any) => {
      const step = nextStep?.signInStep;

      if (step === "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION") {
        const { nextStep: ns } = await confirmSignIn({
          challengeResponse: "EMAIL_OTP" as any,
        });
        return applyNextStep(ns);
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
        const uri = (nextStep as any)?.totpSetupDetails?.getSetupUri?.() ?? null;
        if (uri) setTotpUri(uri);
        setPhase("setup-totp");
        setMsg("Scan the QR / use the key, then enter a 6-digit code.");
        return;
      }

      if (step === "DONE") {
        await finishAdminLogin();
        return;
      }

      setMsg(step ? `Additional step required: ${step}` : "Sign-in incomplete.");
    },
    [finishAdminLogin]
  );

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
  }, [router]);

  const handleSignIn = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);

      try {
        await hardSignOut();

        const { nextStep } = await signIn({
          username: normalizeUsername(email),
          password,
        });

        await applyNextStep(nextStep);
      } catch (err: any) {
        setMsg(friendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [email, password, applyNextStep]
  );

  const handleConfirm = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);

      try {
        const { nextStep } = await confirmSignIn({
          challengeResponse:
            phase === "setup-email" ? normalizeUsername(email) : code.trim(),
        });

        await applyNextStep(nextStep);
      } catch (err: any) {
        setMsg(friendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [phase, code, email, applyNextStep]
  );

  const resetToSignin = useCallback(() => {
    setPhase("signin");
    setCode("");
    setTotpUri(null);
    setMsg("");
  }, []);

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            SW Tax Service • Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Sign In</h1>
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
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {/* ✅ Option 1: disable forgot password until SES approved */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Having trouble signing in?</span>
              <span className="text-xs text-slate-600">
                Reset disabled — contact{" "}
                <span className="font-medium">support@swtaxservice.com</span>
              </span>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
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

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={resetToSignin}
                className="text-sm font-semibold text-slate-700 hover:underline"
              >
                Back
              </button>

              {/* ✅ remove forgot-password link here too */}
              <span className="text-sm text-slate-600">
                Reset disabled — contact{" "}
                <span className="font-medium">support@swtaxservice.com</span>
              </span>
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
                <span className="text-sm font-medium text-slate-700">Email for codes</span>
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
                <span className="text-sm font-medium text-slate-700">6-digit code</span>
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

            <button
              type="button"
              onClick={resetToSignin}
              className="text-sm font-semibold text-slate-700 hover:underline"
            >
              Back
            </button>
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
