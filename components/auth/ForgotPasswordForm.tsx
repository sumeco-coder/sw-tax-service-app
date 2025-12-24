"use client";

import { useEffect, useState } from "react";
import { resetPassword, confirmResetPassword } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

type Props = {
  initialEmail?: string;
  onBack: () => void;
  onDone?: () => void; // optional: when reset succeeds
};

export default function ForgotPasswordForm({ initialEmail = "", onBack, onDone }: Props) {
  useEffect(() => {
    configureAmplify();
  }, []);

  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const username = email.trim().toLowerCase();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const { nextStep } = await resetPassword({ username });

      if (nextStep.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
        setStep("confirm");
      }

      // Keep message generic for security
      setMsg("If an account exists, a reset code was sent to your email.");
    } catch (err: any) {
      setMsg(err?.message ?? "Could not send reset code.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      await confirmResetPassword({
        username,
        confirmationCode: code.trim(),
        newPassword: newPw,
      });

      setMsg("Password updated. You can sign in now.");
      onDone?.();
    } catch (err: any) {
      setMsg(err?.message ?? "Reset failed. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-700">
        <div className="font-semibold">Forgot your password?</div>
        <div>We’ll email you a reset code.</div>
      </div>

      {step === "request" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <input
            className="w-full rounded-lg border px-4 py-2"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <button
            className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send reset code"}
          </button>

          <button
            type="button"
            className="w-full rounded-lg border py-2 hover:bg-gray-50 disabled:opacity-60"
            onClick={onBack}
            disabled={loading}
          >
            Back to sign in
          </button>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-3">
          <input
            className="w-full rounded-lg border px-4 py-2"
            placeholder="Reset code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            required
          />

          <input
            className="w-full rounded-lg border px-4 py-2"
            type="password"
            placeholder="New password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            required
          />

          <button
            className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update password"}
          </button>

          <button
            type="button"
            className="w-full rounded-lg border py-2 hover:bg-gray-50 disabled:opacity-60"
            onClick={onBack}
            disabled={loading}
          >
            Back to sign in
          </button>
        </form>
      )}

      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  );
}
