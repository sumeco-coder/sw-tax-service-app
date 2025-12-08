// app/(auth)/sign-in/page.tsx
"use client";

import { configureAmplify } from "@/lib/amplifyClient";
import Link from "next/link";
import { getClientRole } from "@/lib/auth/roleClient";
import { useRouter } from "next/navigation";
import React, { useCallback, useState, useEffect, FormEvent } from "react";
import {
  signIn,
  confirmSignIn,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  signOut,
} from "aws-amplify/auth";

configureAmplify();

type Phase =
  | "signin"
  | "mfa-email" // CONFIRM_SIGN_IN_WITH_EMAIL_CODE
  | "mfa-totp" // CONFIRM_SIGN_IN_WITH_TOTP_CODE
  | "setup-email" // CONTINUE_SIGN_IN_WITH_EMAIL_SETUP
  | "setup-totp" // CONTINUE_SIGN_IN_WITH_TOTP_SETUP
  | "forgot-start"
  | "forgot-confirm"
  | "done";

export default function SignInPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Central helper: where to send user after successful sign-in

  const redirectAfterLogin = useCallback(async () => {
    try {
      const info = await getClientRole(); // may be null / unknown
      const role = info?.role ?? "unknown";

      // Treat unknown as taxpayer for now
      if (role === "taxpayer" || role === "unknown") {
        // Get Cognito user + email
        const u = await getCurrentUser();
        const session = await fetchAuthSession();

        const tokenEmail =
          (session.tokens?.idToken?.payload["email"] as string | undefined) ??
          "";

        const finalEmail =
          tokenEmail || (u.signInDetails?.loginId as string | undefined) || "";

        // Ensure we have a user row + onboardingStep
        const res = await fetch("/api/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cognitoSub: u.userId,
            email: finalEmail,
          }),
        });

        let onboardingStep: string = "PROFILE";
        if (res.ok) {
          const data = await res.json();
          onboardingStep = data.user?.onboardingStep ?? "PROFILE";
        }

        // ✅ If DONE → dashboard
        if (onboardingStep === "DONE") {
          router.replace("/dashboard");
          return;
        }

        // ✅ If SUBMITTED → final confirmation page
        if (onboardingStep === "SUBMITTED") {
          router.replace("/onboarding/complete");
          return;
        }

        // Map onboardingStep → correct route
        let nextPath = "/onboarding/profile";
        
        switch (onboardingStep) {
          case "PROFILE":
            nextPath = "/onboarding/profile";
            break;
          case "DOCUMENTS":
            nextPath = "/onboarding/documents";
            break;
          case "QUESTIONS":
            nextPath = "/onboarding/questions";
            break;
          case "SCHEDULE":
            nextPath = "/onboarding/schedule";
            break;
          case "SUMMARY":
            // if you prefer them to land on summary instead, change this
            nextPath = "/onboarding/summary";
            break;
          default:
            nextPath = "/onboarding/profile";
        }

        router.replace(nextPath);
        return;
      }

      // LMS / admin roles
      if (role === "lms-preparer" || role === "lms-admin") {
        router.replace("/lms/dashboard");
      } else if (role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        // ultimate fallback
        router.replace("/dashboard");
      }
    } catch (e) {
      console.error("redirectAfterLogin error", e);
      // If something goes wrong, safest to drop taxpayer into onboarding
      router.replace("/onboarding/profile");
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser(); // throws if not signed in
        // Already signed in → just redirect based on role + onboarding
        await redirectAfterLogin();
      } catch {
        // Not signed in → show normal sign-in form
      }
    })();
  }, [redirectAfterLogin]);

  // === 1) SIGN IN ===
  const handleSignIn = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);
      try {
        const { nextStep: signInNextStep } = await signIn({
          username: email.trim(),
          password,
          options: { preferredChallenge: "EMAIL_OTP" },
        });

        if (
          signInNextStep.signInStep ===
          "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION"
        ) {
          const { nextStep: confirmSignInNextStep } = await confirmSignIn({
            challengeResponse: "EMAIL_OTP",
          });

          // Continue with whatever Cognito returns
          (signInNextStep as any).signInStep = confirmSignInNextStep.signInStep;
        }

        if (
          signInNextStep.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE" ||
          signInNextStep.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
        ) {
          // Go to MFA entry depending on factor
          setPhase(
            signInNextStep.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE"
              ? "mfa-email"
              : "mfa-totp"
          );
          setMsg(
            signInNextStep.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE"
              ? "Enter the code sent to your email."
              : "Enter the 6‑digit code from your authenticator app."
          );
        } else if (
          signInNextStep.signInStep === "CONTINUE_SIGN_IN_WITH_EMAIL_SETUP"
        ) {
          // Ask user for an email to bind for OTP codes
          setPhase("setup-email");
          setMsg("Enter the email address to use for one‑time codes.");
        } else if (
          signInNextStep.signInStep === "CONTINUE_SIGN_IN_WITH_TOTP_SETUP"
        ) {
          // Provide provisioning URI if available
          const uri =
            (signInNextStep as any)?.totpSetupDetails?.getSetupUri?.() ?? null;
          if (uri) setTotpUri(uri);
          setPhase("setup-totp");
          setMsg("Scan the QR / use the key, then enter a 6‑digit code.");
        } else if (signInNextStep.signInStep === "DONE") {
          setPhase("done");
          setMsg("Sign in successful!");
          await redirectAfterLogin();
        } else {
          setMsg(`Unexpected step: ${signInNextStep.signInStep}`);
        }
      } catch (err: any) {
        console.error(err);
        if (err?.name === "UserAlreadyAuthenticatedException") {
          setMsg("You are already signed in. Redirecting…");
          await redirectAfterLogin();
        } else {
          setMsg(err?.message ?? "Sign-in failed. Try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [email, password, router, redirectAfterLogin]
  );

  // === 2) CONFIRM MFA (EMAIL OTP or TOTP) ===
  const handleConfirmMfa = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);
      try {
        const { nextStep: confirmSignInNextStep } = await confirmSignIn({
          challengeResponse: code.trim(),
        });

        if (confirmSignInNextStep.signInStep === "DONE") {
          setPhase("done");
          setMsg("Sign in successful!");
          await redirectAfterLogin();
        } else if (
          confirmSignInNextStep.signInStep ===
            "CONFIRM_SIGN_IN_WITH_EMAIL_CODE" ||
          confirmSignInNextStep.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
        ) {
          setMsg("That code didn't work. Try again.");
        } else if (
          confirmSignInNextStep.signInStep ===
          "CONTINUE_SIGN_IN_WITH_TOTP_SETUP"
        ) {
          // Sometimes Amplify wants another fresh TOTP after setup
          setPhase("setup-totp");
          setMsg("Enter a fresh 6‑digit code to finish setup.");
        } else {
          setMsg(`Unexpected step: ${confirmSignInNextStep.signInStep}`);
        }
      } catch (err: any) {
        console.error(err);
        setMsg(err?.message ?? "Invalid code. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [code, redirectAfterLogin]
  );

  // === 3) CONTINUE WITH EMAIL SETUP ===
  const handleConfirmEmailSetup = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);
      try {
        const { nextStep: confirmSignInNextStep } = await confirmSignIn({
          challengeResponse: email.trim(),
        });

        if (
          confirmSignInNextStep.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE"
        ) {
          setPhase("mfa-email");
          setMsg("We sent a 6‑digit code to your email. Enter it below.");
        } else if (confirmSignInNextStep.signInStep === "DONE") {
          setPhase("done");
          setMsg("Sign in successful!");
          await redirectAfterLogin();
        } else {
          setMsg(`Next step: ${confirmSignInNextStep.signInStep}`);
        }
      } catch (err: any) {
        console.error(err);
        setMsg(err?.message ?? "Email setup failed.");
      } finally {
        setLoading(false);
      }
    },
    [email, redirectAfterLogin]
  );

  // === 4) CONTINUE WITH TOTP SETUP ===
  const handleConfirmTotpSetup = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);
      try {
        const { nextStep: confirmSignInNextStep } = await confirmSignIn({
          challengeResponse: code.trim(),
        });

        if (confirmSignInNextStep.signInStep === "DONE") {
          setPhase("done");
          setMsg("TOTP verified. Signed in.");
          await redirectAfterLogin();
        } else if (
          confirmSignInNextStep.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
        ) {
          setPhase("mfa-totp");
          setMsg("Enter a fresh 6‑digit code from your authenticator app.");
        } else {
          setMsg(`Next step: ${confirmSignInNextStep.signInStep}`);
        }
      } catch (err: any) {
        console.error(err);
        setMsg(err?.message ?? "TOTP setup confirmation failed.");
      } finally {
        setLoading(false);
      }
    },
    [code, redirectAfterLogin]
  );

  // === Forgot password (optional, kept on same page) ===
  const handleForgotStart = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);
      try {
        await resetPassword({ username: email.trim() });
        setPhase("forgot-confirm");
        setMsg(
          "We sent a reset code to your email. Enter it below with your new password."
        );
      } catch (err: any) {
        console.error(err);
        setMsg(err?.message ?? "Couldn't start password reset.");
      } finally {
        setLoading(false);
      }
    },
    [email]
  );

  const handleForgotConfirm = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);
      try {
        await confirmResetPassword({
          username: email.trim(),
          confirmationCode: code.trim(),
          newPassword,
        });
        setPhase("signin");
        setMsg("Password updated. Please sign in with your new password.");
        setPassword("");
        setCode("");
        setNewPassword("");
      } catch (err: any) {
        console.error(err);
        setMsg(err?.message ?? "Reset failed. Check the code and try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, code, newPassword]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 shadow-lg rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-900">
          Sign In
        </h1>

        {phase === "signin" && (
          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <input
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              type="email"
              required
            />
            <input
              className="w-full px-4 py-2 border rounded-lg"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                className="text-blue-700 hover:underline"
                onClick={() => setPhase("forgot-start")}
              >
                Forgot password?
              </button>
              <div className="mt-2 text-sm text-center">
                Don’t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="text-blue-700 hover:underline font-semibold"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </form>
        )}

        {phase === "setup-email" && (
          <form onSubmit={handleConfirmEmailSetup} className="mt-6 space-y-4">
            <input
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Email for codes"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Continue"}
            </button>
          </form>
        )}

        {phase === "setup-totp" && (
          <form onSubmit={handleConfirmTotpSetup} className="mt-6 space-y-4">
            {totpUri && (
              <div className="text-xs p-3 rounded bg-gray-50 break-all">
                <div className="font-medium mb-1">Provisioning URI</div>
                <div>{totpUri}</div>
              </div>
            )}
            <input
              className="border p-2 w-full"
              placeholder="6‑digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}

        {phase === "mfa-email" && (
          <form onSubmit={handleConfirmMfa} className="mt-6 space-y-4">
            <input
              className="border p-2 w-full"
              placeholder="6‑digit email code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Confirming..." : "Confirm"}
            </button>
          </form>
        )}

        {phase === "mfa-totp" && (
          <form onSubmit={handleConfirmMfa} className="mt-6 space-y-4">
            <input
              className="border p-2 w-full"
              placeholder="6‑digit authenticator code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Confirming..." : "Confirm"}
            </button>
          </form>
        )}

        {phase === "forgot-start" && (
          <form onSubmit={handleForgotStart} className="mt-6 space-y-4">
            <p className="text-sm text-gray-700">
              Enter your account email and we'll send a reset code.
            </p>
            <input
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
            <div className="flex gap-3">
              <button
                type="button"
                className="px-4 py-2 border rounded-lg"
                onClick={() => setPhase("signin")}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send code"}
              </button>
            </div>
          </form>
        )}

        {phase === "forgot-confirm" && (
          <form onSubmit={handleForgotConfirm} className="mt-6 space-y-4">
            <p className="text-sm text-gray-700">
              We emailed you a reset code. Enter it with your new password.
            </p>
            <input
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="6‑digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
            <input
              className="w-full px-4 py-2 border rounded-lg"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <div className="flex gap-3">
              <button
                type="button"
                className="px-4 py-2 border rounded-lg"
                onClick={() => setPhase("signin")}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </div>
          </form>
        )}

        {phase === "done" && (
          <div className="mt-6 text-center text-green-700 font-medium">
            Signed in successfully.
          </div>
        )}

        <div className="text-sm mt-3 min-h-6 text-gray-700">{msg}</div>
      </div>
    </div>
  );
}
