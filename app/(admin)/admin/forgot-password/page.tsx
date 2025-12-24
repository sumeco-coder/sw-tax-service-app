// app/(admin)/admin/forgot-password/page.tsx
"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword, confirmResetPassword } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

type Step = "request" | "confirm";

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function friendlyError(err: any) {
  const raw = String(err?.message ?? "Something went wrong.");
  const name = String(err?.name ?? err?.__type ?? "");

  if (raw.includes("Attempt limit exceeded") || raw.includes("Too many failed attempts")) {
    return "Too many attempts. Please wait a bit and try again.";
  }
  if (raw.includes("Invalid verification code") || raw.includes("Invalid code")) {
    return "That code didn’t work. Double-check it and try again.";
  }
  if (raw.toLowerCase().includes("expired")) {
    return "That code expired. Please resend a new one.";
  }
  if (raw.includes("Password did not conform") || raw.includes("InvalidPassword")) {
    return "Password doesn’t meet requirements. Try a stronger password (mix of upper/lowercase, number, symbol).";
  }

  return name ? `${name}: ${raw}` : raw;
}

export default function AdminForgotPasswordPage() {
  const router = useRouter();

  // ✅ Configure Amplify on the client after mount (safer than module-level)
  useEffect(() => {
    configureAmplify();
  }, []);

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // resend cooldown
  const [cooldown, setCooldown] = useState(0);

  const codeRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  // prevent double auto-submits
  const lastAutoSubmitRef = useRef<{ code: string; pw: string } | null>(null);

  const username = useMemo(() => normalizeEmail(email), [email]);

  const canSend = username.length > 3 && username.includes("@");
  const canConfirm =
    canSend &&
    /^\d{6}$/.test(code.trim()) && // require 6 digits for admin reset
    newPassword.length >= 8;

  // focus code input when moving to confirm step
  useEffect(() => {
    if (step !== "confirm") return;
    const t = setTimeout(() => codeRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [step]);

  // cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendCode = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");

      if (!canSend) {
        setMsg("Enter a valid email address.");
        return;
      }

      if (cooldown > 0) {
        setMsg(`Please wait ${cooldown}s before resending.`);
        return;
      }

      setLoading(true);

      try {
        const out = await resetPassword({ username });

        // Avoid leaking whether account exists
        const destination = out?.nextStep?.codeDeliveryDetails?.destination;

        setMsg(
          destination
            ? `If the account exists, a reset code was sent to ${destination}.`
            : "If the account exists, a reset code was sent. Check your email."
        );

        setStep("confirm");
        setCooldown(30);
      } catch (err: any) {
        setMsg(friendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [username, canSend, cooldown]
  );

  const resendCode = useCallback(async () => {
    await sendCode();
  }, [sendCode]);

  const confirm = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setMsg("");

      if (!canConfirm) {
        setMsg("Enter your email, the 6-digit code, and a stronger password (8+ chars).");
        return;
      }

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
        setMsg(friendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [username, code, newPassword, canConfirm, router]
  );

  // ✅ Auto-submit when code becomes 6 digits AND password is valid
  useEffect(() => {
    if (step !== "confirm") return;
    if (loading) return;

    const c = code.trim();
    const pw = newPassword;

    if (!/^\d{6}$/.test(c)) return;

    // If password not ready, push focus to password
    if (pw.length < 8) {
      passwordRef.current?.focus();
      return;
    }

    // Prevent re-submitting same values
    const last = lastAutoSubmitRef.current;
    if (last && last.code === c && last.pw === pw) return;

    lastAutoSubmitRef.current = { code: c, pw };
    confirm();
  }, [step, code, newPassword, loading, confirm]);

  const resetToRequest = useCallback(() => {
    setStep("request");
    setCode("");
    setNewPassword("");
    setMsg("");
    lastAutoSubmitRef.current = null;
  }, []);

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
                disabled={loading}
              />
            </label>

            <button
              type="submit"
              disabled={loading || !canSend || cooldown > 0}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Sending..." : cooldown > 0 ? `Wait ${cooldown}s` : "Send reset code"}
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
                disabled={loading}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Reset code</span>
              <input
                ref={codeRef}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={code}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(digits);

                  // when user reaches 6 digits, focus password
                  if (digits.length === 6) {
                    setTimeout(() => passwordRef.current?.focus(), 0);
                  }

                  // reset auto-submit lock when code changes
                  lastAutoSubmitRef.current = null;
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                required
                disabled={loading}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">New password</span>
              <input
                ref={passwordRef}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  // reset auto-submit lock when password changes
                  lastAutoSubmitRef.current = null;
                }}
                autoComplete="new-password"
                required
                disabled={loading}
              />
              <p className="mt-1 text-xs text-slate-500">
                Use 8+ characters. Your pool may require upper/lowercase, number, and symbol.
              </p>
            </label>

            <button
              type="submit"
              disabled={loading || !canConfirm}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update password"}
            </button>

            <div className="mt-2 flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={loading || cooldown > 0 || !canSend}
                onClick={resendCode}
                className="text-slate-600 hover:underline disabled:opacity-60"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={resetToRequest}
                  className="text-slate-600 hover:underline disabled:opacity-60"
                >
                  Change email
                </button>

                <Link href="/admin/sign-in" className="text-slate-600 hover:underline">
                  Back to sign-in
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
