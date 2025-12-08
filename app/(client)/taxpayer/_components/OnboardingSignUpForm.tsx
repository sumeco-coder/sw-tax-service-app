// app/(client)/taxpayer/_components/OnboardingSignUpForm.tsx
"use client";

import { useState } from "react";
import { signUp, confirmSignUp, signIn } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import Link from "next/link";
import { completeInvite } from "../onboarding-sign-up/actions";
import { useRouter } from "next/navigation";

configureAmplify();

interface Props {
  email: string;
  token: string;
  plan?: string;
}

type Phase = "signup" | "confirm";

export default function OnboardingSignUpForm({ email, token, plan }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("signup");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            // later: "custom:source": "waitlist", "custom:plan": plan, ...
          },
        },
      });

      if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setPhase("confirm");
        setMsg(
          `We sent a verification code to ${
            nextStep.codeDeliveryDetails?.destination ?? email
          }.`
        );
      } else if (isSignUpComplete) {
        setMsg("Sign-up complete! You can now continue.");
      }
    } catch (err: any) {
      console.error(err);
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
      // 1️⃣ Confirm the account
      await confirmSignUp({
        username: email,
        confirmationCode: code.trim(),
      });

      // 2️⃣ Immediately sign them in so /onboarding sees the correct Cognito user
      if (password) {
        try {
          await signIn({
            username: email,
            password,
          });
        } catch (err) {
          console.error("signIn after confirm failed (but continuing):", err);
        }
      }

      // 3️⃣ Mark the invite as accepted in Postgres
      try {
        await completeInvite(token);
      } catch (err) {
        console.error("completeInvite failed:", err);
      }

      // 4️⃣ Send them into your onboarding flow
      setMsg("Account confirmed! Taking you to onboarding…");
      router.push("/onboarding");
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message ?? "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Taxpayer onboarding
        </p>
        <p className="text-sm text-slate-600">
          You&apos;re creating an account for{" "}
          <span className="font-medium text-slate-900">{email}</span>
          {plan ? (
            <>
              {" "}
              on plan <span className="font-semibold">{plan}</span>.
            </>
          ) : (
            "."
          )}
        </p>
      </div>

      {phase === "signup" ? (
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Email (locked) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
            <p className="mt-1 text-xs text-slate-500">
              Email is locked to the address that received this invite.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Create a password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a secure password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Hidden token (not used by browser, but ok for future form actions) */}
          <input type="hidden" name="token" value={token} />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-blue-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Verification code
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter the 6-digit code"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Confirming…" : "Confirm account"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Already confirmed?{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-blue-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}

      {msg && (
        <p className="mt-3 text-xs text-slate-600" aria-live="polite">
          {msg}
        </p>
      )}
    </div>
  );
}
