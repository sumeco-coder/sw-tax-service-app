"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, confirmSignUp } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import Link from "next/link";

configureAmplify();

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Invite token from the URL: /taxpayer/onboarding-sign-up?token=ABC123
  const inviteToken = searchParams.get("token") ?? "";
  const hasInviteToken = Boolean(inviteToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"signup" | "confirm">("signup");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!hasInviteToken) {
      setMsg(
        "This onboarding link is invalid or has expired. Please contact support."
      );
      return;
    }

    setLoading(true);
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email, "custom:inviteToken": inviteToken },
        },
      });

      if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setPhase("confirm");
        setMsg(
          `Verification code sent to ${nextStep.codeDeliveryDetails?.destination ?? email}.`
        );
      } else if (isSignUpComplete) {
        setMsg("Sign-up complete! You can now sign in.");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Sign-up failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code.trim() });
      setMsg("Account confirmed! Redirecting to your onboarding...");
      router.push("/onboarding"); // or "/taxpayer/onboarding" if that's your route
    } catch (err: any) {
      setMsg(err?.message ?? "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const disabledForInvalidToken = !hasInviteToken;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 shadow-lg rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-blue-900">
          Complete Your Tax Onboarding
        </h2>
        <p className="mt-2 text-center text-sm text-gray-700">
          You’re off the waitlist 🎉 Create your account to start your SW Tax
          onboarding.
        </p>

        {!hasInviteToken && (
          <div className="mt-4 text-sm text-red-600 text-center">
            This onboarding link is invalid or has expired. Please reach out to
            support to request a new invite.
          </div>
        )}

        {phase === "signup" ? (
          <form onSubmit={handleSignUp} className="mt-4 space-y-4">
            <input
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              disabled={disabledForInvalidToken}
            />
            <input
              className="w-full px-4 py-2 border rounded-lg"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={disabledForInvalidToken}
            />
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
              disabled={loading || disabledForInvalidToken}
            >
              {loading ? "Creating..." : "Create Account & Continue"}
            </button>

            <div className="text-center mt-2 text-sm">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-blue-700 hover:underline font-semibold"
              >
                Sign in
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="mt-4 space-y-4">
            <input
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm Account"}
            </button>

            <div className="text-center mt-2 text-sm">
              Already confirmed?{" "}
              <Link
                href="/sign-in"
                className="text-blue-700 hover:underline font-semibold"
              >
                Sign in
              </Link>
            </div>
          </form>
        )}

        <div className="text-sm mt-3 text-gray-700">{msg}</div>
      </div>
    </div>
  );
}
