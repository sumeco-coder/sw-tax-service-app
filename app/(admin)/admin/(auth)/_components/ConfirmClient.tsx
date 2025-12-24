"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { configureAmplify } from "@/lib/amplifyClient";
import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function friendlyError(err: any) {
  const raw = String(err?.message ?? "Confirmation failed.");
  if (raw.toLowerCase().includes("expired")) return "That code expired. Please resend a new one.";
  if (raw.includes("Invalid verification code") || raw.includes("Invalid code"))
    return "That code didn’t work. Double-check it and try again.";
  if (raw.includes("Attempt limit exceeded")) return "Too many attempts. Wait a bit and try again.";
  return raw;
}

export default function ConfirmClient() {
  useEffect(() => {
    configureAmplify();
  }, []);

  const router = useRouter();
  const sp = useSearchParams();

  // Read from URL but also allow editing (in case user opens wrong link)
  const emailFromUrl = useMemo(() => normalizeEmail(sp.get("email") ?? ""), [sp]);
  const [email, setEmail] = useState(emailFromUrl);

  useEffect(() => {
    // Keep in sync if URL changes
    setEmail(emailFromUrl);
  }, [emailFromUrl]);

  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const username = useMemo(() => normalizeEmail(email), [email]);
  const canSubmit = username.includes("@") && code.trim().length >= 4;

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setMsg(null);
      setPending(true);

      try {
        await confirmSignUp({
          username,
          confirmationCode: code.trim(),
        });

        router.replace("/admin/sign-in");
      } catch (err: any) {
        setError(friendlyError(err));
      } finally {
        setPending(false);
      }
    },
    [username, code, router]
  );

  const onResend = useCallback(async () => {
    setError(null);
    setMsg(null);
    setPending(true);

    try {
      await resendSignUpCode({ username });
      setMsg("A new verification code has been sent.");
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setPending(false);
    }
  }, [username]);

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Confirm admin email</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the code sent to <span className="font-medium">{username || "your email"}</span>.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {msg ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {msg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="username"
              required
              disabled={pending}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Verification code</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={code}
              onChange={(e) => {
                // allow digits only; keep it simple
                const digits = e.target.value.replace(/\D/g, "");
                setCode(digits);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              disabled={pending}
            />
          </label>

          <button
            type="submit"
            disabled={pending || !canSubmit}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Confirming..." : "Confirm"}
          </button>

          <button
            type="button"
            onClick={onResend}
            disabled={pending || !username.includes("@")}
            className="w-full rounded-xl border px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {pending ? "Sending..." : "Resend code"}
          </button>
        </form>

        <div className="mt-5 text-sm">
          <Link href="/admin/sign-in" className="text-slate-600 hover:underline">
            Back to admin sign-in
          </Link>
        </div>
      </div>
    </div>
  );
}
