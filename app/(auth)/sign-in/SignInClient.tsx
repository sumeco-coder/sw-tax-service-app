// app/(auth)/sign-in/SigninClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signIn,
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
  fetchUserAttributes,
} from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

type View = "signin" | "confirmSignIn" | "confirmSignUp" | "forgot";

function cleanEmail(v: string) {
  return v.trim().toLowerCase();
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

export default function SigninClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    configureAmplify();
  }, []);

  // Invite context (token from your DB invite links can be passed as ?invite=TOKEN)
  const invite = useMemo(() => (searchParams.get("invite") ?? "").trim(), [searchParams]);

  // support both next & redirect
  const nextParam = useMemo(
    () => searchParams.get("next") ?? searchParams.get("redirect"),
    [searchParams]
  );

  // ✅ Invited users default into onboarding; otherwise dashboard
  const redirectTo = useMemo(() => {
    const fallback = invite ? "/onboarding/profile" : "/dashboard";
    return safeInternalPath(nextParam, fallback);
  }, [nextParam, invite]);

  const signUpHref = useMemo(() => {
    const params = new URLSearchParams();
    if (invite) params.set("invite", invite);
    if (redirectTo) params.set("next", redirectTo);
    const qs = params.toString();
    return `/sign-up${qs ? `?${qs}` : ""}`;
  }, [invite, redirectTo]);

  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const username = cleanEmail(email);

  function backToSignIn() {
    setView("signin");
    setMsg("");
    setCode("");
  }

  /** ✅ Force onboarding for taxpayers (or invite flow) until onboardingComplete=true */
  async function routeAfterAuth() {
    const intended = redirectTo || "/dashboard";

    try {
      const attrs = await fetchUserAttributes();
      const role = (attrs["custom:role"] ?? "").toLowerCase();
      const onboardingComplete =
        (attrs["custom:onboardingComplete"] ?? "").toLowerCase() === "true";

      // If they are invited OR taxpayer, and onboarding isn't complete, force onboarding.
      // (Invite param is your strongest indicator they are in the onboarding funnel.)
      if ((invite || role === "taxpayer") && !onboardingComplete) {
        const qs = new URLSearchParams();
        // preserve intended destination so onboarding can send them there later
        if (intended) qs.set("next", intended);
        router.push(`/onboarding/profile?${qs.toString()}`);
        return;
      }
    } catch {
      // If we can't read attrs, just continue to intended
    }

    router.push(intended);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!username) {
      setMsg("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const res = await signIn({ username, password });

      if (res.isSignedIn) {
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

      if (step === "CONFIRM_SIGN_UP") {
        setView("confirmSignUp");
        setMsg("Your account isn’t confirmed yet. Enter your confirmation code.");
        return;
      }

      // Other steps exist (e.g., RESET_PASSWORD / SELECT_MFA_TYPE) — keep a readable message
      setView("confirmSignIn");
      setMsg(step ? `Additional sign-in step required: ${step}` : "Continue sign-in.");
    } catch (e: unknown) {
      setMsg(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await confirmSignIn({ challengeResponse: code.trim() });
      if (res.isSignedIn) {
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

  async function handleConfirmSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!username) {
      setMsg("Enter your email above first, then your confirmation code.");
      return;
    }

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

    if (!username) {
      setMsg("Enter your email above first, then click resend.");
      return;
    }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-extrabold text-blue-900 text-center">
          {view === "signin" ? (invite ? "Sign in to continue onboarding" : "Sign in") : "Account access"}
        </h1>

        {view === "signin" && (
          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <input
              className="w-full rounded-lg border px-4 py-2"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <input
              className="w-full rounded-lg border px-4 py-2"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-blue-700 hover:underline"
                onClick={() => {
                  setMsg("");
                  setView("forgot");
                }}
              >
                Forgot password?
              </button>

              <Link href={signUpHref} className="text-blue-700 hover:underline font-semibold">
                Create account
              </Link>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <div className="mt-6">
            <ForgotPasswordForm initialEmail={email} onBack={backToSignIn} onDone={backToSignIn} />
          </div>
        )}

        {view === "confirmSignIn" && (
          <form onSubmit={handleConfirmSignIn} className="mt-6 space-y-4">
            <input
              className="w-full rounded-lg border px-4 py-2"
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
              className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm"}
            </button>

            <button
              type="button"
              className="w-full rounded-lg border py-2 hover:bg-gray-50 disabled:opacity-60"
              disabled={loading}
              onClick={backToSignIn}
            >
              Back to sign in
            </button>
          </form>
        )}

        {view === "confirmSignUp" && (
          <form onSubmit={handleConfirmSignUp} className="mt-6 space-y-4">
            <div className="text-sm text-gray-700">
              Your account isn’t confirmed yet. Enter the confirmation code sent to your email.
            </div>

            <input
              className="w-full rounded-lg border px-4 py-2"
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
              className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm account"}
            </button>

            <button
              type="button"
              className="w-full rounded-lg border py-2 hover:bg-gray-50 disabled:opacity-60"
              disabled={loading}
              onClick={handleResendSignUpCode}
            >
              {loading ? "Sending..." : "Resend code"}
            </button>

            <button
              type="button"
              className="w-full rounded-lg border py-2 hover:bg-gray-50 disabled:opacity-60"
              disabled={loading}
              onClick={backToSignIn}
            >
              Back to sign in
            </button>
          </form>
        )}

        {msg && <div className="mt-4 text-sm text-gray-700">{msg}</div>}
      </div>
    </div>
  );
}
