// app/(admin)/admin/forgot-password/page.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword, confirmResetPassword } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

configureAmplify();

type Step = "request" | "confirm";

export default function AdminForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const username = useMemo(() => email.trim().toLowerCase(), [email]);

  const sendCode = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");
      setLoading(true);

      try {
        const out = await resetPassword({ username });

        if (
          out.nextStep?.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE"
        ) {
          const dest = out.nextStep.codeDeliveryDetails?.destination;
          setMsg(dest ? `Reset code sent to ${dest}.` : "Reset code sent. Check your email.");
        } else {
          // Cognito often responds generically; keep it generic to avoid account enumeration
          setMsg("If the account exists, a reset code has been sent.");
        }

        setStep("confirm");
      } catch (err: any) {
        setMsg(String(err?.message ?? "Could not send reset code."));
      } finally {
        setLoading(false);
      }
    },
    [username]
  );

  const resendCode = useCallback(async () => {
    if (!username) {
      setMsg("Enter your email first.");
      setStep("request");
      return;
    }
    await sendCode(); // re-use same logic, but without an event
  }, [sendCode, username]);

  const confirm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setMsg("");
      setLoading(true);

      try {
        await confirmResetPassword({
          username,
          confirmationCode: code.trim(),
          newPassword,
        });

        setMsg("Password updated. Redirecting to admin sign-in…");
        setTimeout(() => router.replace("/admin/sign-in"), 700);
      } catch (err: any) {
        setMsg(String(err?.message ?? "Could not reset password."));
      } finally {
        setLoading(false);
      }
    },
    [username, code, newPassword, router]
  );

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            SW Tax Service • Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-600">
            {step === "request"
              ? "Enter your admin email to receive a reset code."
              : "Enter the code and choose a new password."}
          </p>
        </div>

        {msg ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {msg}
          </div>
        ) : null}

        {step === "request" ? (
          <form onSubmit={sendCode} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
                autoComplete="username"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset code"}
            </button>

            <div className="mt-2 flex items-center justify-between text-sm">
              <Link href="/admin/sign-in" className="text-slate-600 hover:underline">
                Back to admin sign-in
              </Link>
              <Link href="/" className="text-slate-600 hover:underline">
                Back to site
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={confirm} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
                autoComplete="username"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Reset code</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">New password</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Tip: Use 8+ chars with a mix of upper/lowercase, a number, and a symbol (depending on your pool policy).
              </p>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update password"}
            </button>

            <div className="mt-2 flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={loading}
                onClick={resendCode}
                className="text-slate-600 hover:underline disabled:opacity-60"
              >
                Resend code
              </button>

              <Link href="/admin/sign-in" className="text-slate-600 hover:underline">
                Back to admin sign-in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
