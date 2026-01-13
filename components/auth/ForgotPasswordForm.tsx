"use client";

import { useEffect, useMemo, useState } from "react";
import { resetPassword, confirmResetPassword } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

type Props = {
  initialEmail?: string;
  onBack: () => void;
  onDone?: () => void; // optional: when reset succeeds
};

const BRAND = {
  pink: "#E62A68",
  copper: "#BB4E2B",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

export default function ForgotPasswordForm({
  initialEmail = "",
  onBack,
  onDone,
}: Props) {
  useEffect(() => {
    configureAmplify();
  }, []);

  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const username = useMemo(() => email.trim().toLowerCase(), [email]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg("");

    if (!username) {
      setMsg("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ username });

      // ✅ Always move to confirm step (best UX)
      setStep("confirm");

      // ✅ Keep message generic for security
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

    if (!username) {
      setMsg("Please enter your email.");
      setStep("request");
      return;
    }

    if (!code.trim()) {
      setMsg("Enter the reset code.");
      return;
    }

    if (newPw.length < 8) {
      setMsg("New password must be at least 8 characters.");
      return;
    }

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
      <div className="text-sm text-slate-700">
        <div className="font-semibold">Forgot your password?</div>
        <div>We’ll email you a reset code.</div>
      </div>

      {step === "request" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <button
            type="submit"
            style={brandGradient}
            className="w-full rounded-xl py-2.5 font-semibold text-white shadow-sm transition
                       hover:brightness-110 active:brightness-95 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send reset code"}
          </button>

          <button
            type="button"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            onClick={onBack}
            disabled={loading}
          >
            Back to sign in
          </button>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-3">
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
            placeholder="Reset code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            required
          />

          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
            type="password"
            placeholder="New password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            required
          />

          <button
            type="submit"
            style={brandGradient}
            className="w-full rounded-xl py-2.5 font-semibold text-white shadow-sm transition
                       hover:brightness-110 active:brightness-95 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update password"}
          </button>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => sendCode()}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              disabled={loading}
            >
              Resend code
            </button>

            <button
              type="button"
              onClick={() => {
                setMsg("");
                setCode("");
                setNewPw("");
                setStep("request");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              disabled={loading}
            >
              Change email
            </button>
          </div>

          <button
            type="button"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            onClick={onBack}
            disabled={loading}
          >
            Back to sign in
          </button>
        </form>
      )}

      {msg && <div className="text-sm text-slate-700">{msg}</div>}
    </div>
  );
}
