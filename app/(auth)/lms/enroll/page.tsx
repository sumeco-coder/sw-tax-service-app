"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, confirmSignUp } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import Link from "next/link";

configureAmplify();

export default function LMSEnrollmentSignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      setMsg("Invalid or expired LMS enrollment link.");
      return;
    }

    setLoading(true);
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            "custom:inviteToken": inviteToken, // assigns PREPARER role
          },
        },
      });

      if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setPhase("confirm");
        setMsg(
          `Verification code sent to ${
            nextStep.codeDeliveryDetails?.destination ?? email
          }.`
        );
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Sign-up failed.");
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
      setMsg("Enrollment confirmed! Redirecting...");
      router.push("/lms/dashboard");
    } catch (err: any) {
      setMsg(err?.message ?? "Invalid code.");
    } finally {
      setLoading(false);
    }
  }

  const disabled = !hasInviteToken;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 shadow-lg rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-purple-900">
          LMS Enrollment
        </h2>
        <p className="mt-2 text-center text-sm text-gray-700">
          You’ve been invited to join the SW Tax LMS as a preparer.
        </p>

        {!hasInviteToken && (
          <div className="text-red-600 text-sm mt-4 text-center">
            Invalid or expired link.
          </div>
        )}

        {phase === "signup" ? (
          <form onSubmit={handleSignUp} className="mt-4 space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={disabled}
            />

            <input
              placeholder="Create password"
              className="w-full px-4 py-2 border rounded-lg"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={disabled}
            />

            <button
              type="submit"
              disabled={loading || disabled}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
            >
              {loading ? "Creating..." : "Enroll Now"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="mt-4 space-y-4">
            <input
              placeholder="Verification code"
              className="w-full px-4 py-2 border rounded-lg"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
            >
              {loading ? "Confirming..." : "Confirm Enrollment"}
            </button>
          </form>
        )}

        <div className="text-sm mt-3 text-gray-700 min-h-[1.5rem]">{msg}</div>

        <div className="text-center mt-3">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-purple-600 underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
