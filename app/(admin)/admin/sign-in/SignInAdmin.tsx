// app/(admin)/admin/sign-in/SignInAdmin.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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

type Phase = "signin" | "mfa-email" | "mfa-totp" | "done";

function isAdminFromPayload(payload: any) {
  const role = payload?.["custom:role"];
  const groups: string[] = payload?.["cognito:groups"] ?? [];
  return role === "admin" || groups.includes("admin");
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
    await signOut({ global: true });
  } catch {
    try {
      await signOut();
    } catch {}
  }
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  await new Promise((r) => setTimeout(r, 150));
}

export default function SignInClient() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // On load:
  // - if a session exists, sync cookies -> if admin go /admin, else sign out
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await getCurrentUser(); // throws if not signed in
        const session = await syncServerCookiesFromSession();
        const payload: any = session?.tokens?.idToken?.payload ?? {};

        if (cancelled) return;

        if (isAdminFromPayload(payload)) {
          router.replace("/admin");
          router.refresh();
          return;
        }

        // signed in but not admin -> clear
        await hardSignOut();
      } catch {
        // not signed in
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const finishAdminLogin = useCallback(async () => {
    const session = await syncServerCookiesFromSession();
    const payload: any = session?.tokens?.idToken?.payload ?? {};

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

  const handleSignIn = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);

      try {
        // Clear any existing session before signing in
        await hardSignOut();

        const { nextStep } = await signIn({
          username: email.trim().toLowerCase(),
          password,
          // keep default, or force email OTP if your pool is configured that way:
          // options: { preferredChallenge: "EMAIL_OTP" as any },
        });

        const step = nextStep?.signInStep;

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

        if (step === "DONE") {
          await finishAdminLogin();
          return;
        }

        // If your pool ever returns other steps, show it (so you can handle later)
        setMsg(step ? `Additional step required: ${step}` : "Sign-in incomplete.");
      } catch (err: any) {
        const message = String(err?.message ?? "Sign-in failed.");
        setMsg(message);
      } finally {
        setLoading(false);
      }
    },
    [email, password, finishAdminLogin]
  );

  const handleConfirmMfa = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);

      try {
        const { nextStep } = await confirmSignIn({
          challengeResponse: code.trim(),
        });

        if (nextStep?.signInStep === "DONE") {
          await finishAdminLogin();
          return;
        }

        setMsg(nextStep?.signInStep ? `Next: ${nextStep.signInStep}` : "Try again.");
      } catch (err: any) {
        setMsg(String(err?.message ?? "Invalid code."));
      } finally {
        setLoading(false);
      }
    },
    [code, finishAdminLogin]
  );

  if (checking) return null;

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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <button
              type="button"
              onClick={async () => {
                await hardSignOut();
                router.refresh();
                setMsg("Signed out.");
              }}
              className="w-full rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Force sign out
            </button>
          </form>
        )}

        {(phase === "mfa-email" || phase === "mfa-totp") && (
          <form onSubmit={handleConfirmMfa} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {phase === "mfa-email" ? "Email code" : "Authenticator code"}
              </span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Confirming..." : "Confirm"}
            </button>

            <button
              type="button"
              onClick={() => {
                setPhase("signin");
                setCode("");
                setMsg("");
              }}
              className="w-full rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back
            </button>
          </form>
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