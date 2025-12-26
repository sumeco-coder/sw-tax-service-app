// app/(auth)/sign-up/SignUpClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp, confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

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

export default function SignUpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    configureAmplify();
  }, []);

  // ✅ invite token (use ?invite=TOKEN)
  const inviteToken = useMemo(() => {
    const v = searchParams.get("invite");
    return v ? v.trim() : "";
  }, [searchParams]);

  const hasInviteToken = Boolean(inviteToken);

  // ✅ support both: ?next=/... and ?redirect=/...
  const nextParam = useMemo(
    () => searchParams.get("next") ?? searchParams.get("redirect"),
    [searchParams]
  );

  const nextPath = useMemo(() => {
    const fallback = hasInviteToken ? "/onboarding/profile" : "/dashboard";
    return safeInternalPath(nextParam, fallback);
  }, [nextParam, hasInviteToken]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"signup" | "confirm">("signup");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // If you ONLY allow invited signups, keep this true.
  const disabledForInvalidToken = !hasInviteToken;

  const signInHref = useMemo(() => {
    const params = new URLSearchParams();
    if (inviteToken) params.set("invite", inviteToken);
    if (nextPath) params.set("next", nextPath);
    const qs = params.toString();
    return `/sign-in${qs ? `?${qs}` : ""}`;
  }, [inviteToken, nextPath]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!hasInviteToken) {
      setMsg("This invite link is invalid or has expired. Please contact support.");
      return;
    }

    const username = cleanEmail(email);
    if (!username) {
      setMsg("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email: username,
            // Only keep this if you CREATED this custom attribute in Cognito:
            "custom:inviteToken": inviteToken,
          },
          // ✅ PostConfirmation trigger can read this
          clientMetadata: {
            inviteCode: inviteToken,
          },
        },
      });

      if (nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setPhase("confirm");
        setMsg(
          `Verification code sent to ${
            nextStep.codeDeliveryDetails?.destination ?? username
          }.`
        );
        return;
      }

      if (isSignUpComplete) {
        // Still not signed in; send to sign-in with invite + next
        router.push(signInHref);
        return;
      }

      setPhase("confirm");
      setMsg("Please check your email for a verification code.");
    } catch (err) {
      setMsg(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const username = cleanEmail(email);
      await confirmSignUp({
        username,
        confirmationCode: code.trim(),
      });

      // ✅ confirm does NOT sign them in — route to sign-in (with invite + next)
      setMsg("Account confirmed! Please sign in to continue.");
      router.push(signInHref);
    } catch (err) {
      setMsg(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setMsg("");
    const username = cleanEmail(email);
    if (!username) {
      setMsg("Enter your email first, then click resend.");
      return;
    }

    setLoading(true);
    try {
      await resendSignUpCode({ username });
      setMsg("A new verification code has been sent.");
    } catch (err) {
      setMsg(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 shadow-lg rounded-2xl w-full max-w-md">
        <h2 className="text-2xl font-extrabold text-center text-blue-900">
          Complete your onboarding
        </h2>
        <p className="mt-2 text-center text-sm text-gray-700">
          You’re off the waitlist 🎉 Create your account to start your SW Tax onboarding.
        </p>

        {!hasInviteToken && (
          <div className="mt-4 text-sm text-red-600 text-center">
            This invite link is invalid or has expired. Please contact support for a new invite.
          </div>
        )}

        {phase === "signup" ? (
          <form onSubmit={handleSignUp} className="mt-6 space-y-4">
            <input
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              disabled={disabledForInvalidToken}
              autoComplete="email"
            />

            <input
              className="w-full px-4 py-2 border rounded-lg"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={disabledForInvalidToken}
              autoComplete="new-password"
            />

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
              disabled={loading || disabledForInvalidToken}
            >
              {loading ? "Creating..." : "Create account"}
            </button>

            <div className="text-center mt-2 text-sm">
              Already have an account?{" "}
              <Link href={signInHref} className="text-blue-700 hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="mt-6 space-y-4">
            <div className="text-sm text-gray-700">
              Enter the verification code sent to your email.
            </div>

            <input
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              required
              autoComplete="one-time-code"
            />

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm account"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              className="w-full py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Sending..." : "Resend code"}
            </button>

            <div className="text-center mt-2 text-sm">
              Want to sign in instead?{" "}
              <Link href={signInHref} className="text-blue-700 hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </form>
        )}

        {msg && <div className="text-sm mt-4 text-gray-700">{msg}</div>}
      </div>
    </div>
  );
}
