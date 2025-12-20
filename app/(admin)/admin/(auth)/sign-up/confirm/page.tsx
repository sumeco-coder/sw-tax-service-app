"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { configureAmplify } from "@/lib/amplifyClient";
import { confirmSignUp } from "aws-amplify/auth";

export default function AdminConfirmPage() {
  useEffect(() => {
    // ✅ runs only on the client (prevents build/prerender crash)
    configureAmplify();
  }, []);

  const router = useRouter();
  const sp = useSearchParams();
  const email = useMemo(() => (sp.get("email") ?? "").toLowerCase(), [sp]);

  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code.trim(),
      });

      router.replace("/admin/sign-in");
    } catch (err: any) {
      setError(err?.message ?? "Confirmation failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Confirm admin email</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the code sent to{" "}
          <span className="font-medium">{email || "your email"}</span>.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Verification code</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </label>

          <button
            type="submit"
            disabled={pending || !email}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Confirming..." : "Confirm"}
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
