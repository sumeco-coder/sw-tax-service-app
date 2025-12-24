// app/(auth)/sign-in/SigninClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, confirmSignIn, confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
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

export default function SigninClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    configureAmplify();
  }, []);

  const redirectTo = useMemo(
    () => searchParams.get("redirect") ?? "/dashboard",
    [searchParams]
  );

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

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await signIn({ username, password });

      if (res.isSignedIn) {
        router.push(redirectTo);
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

      // Some other step (rare) — show confirm screen
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
        router.push(redirectTo);
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
          {view === "signin" ? "Sign in" : "Account access"}
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

              <Link href="/sign-up" className="text-blue-700 hover:underline font-semibold">
                Create account
              </Link>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <div className="mt-6">
            <ForgotPasswordForm
              initialEmail={email}
              onBack={backToSignIn}
              onDone={backToSignIn}
            />
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
