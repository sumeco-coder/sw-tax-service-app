// app/(admin)/admin/(auth)/sign-up/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { configureAmplify } from "@/lib/amplifyClient";
import { signUp } from "aws-amplify/auth";

configureAmplify();

export default function AdminSignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const username = email.trim().toLowerCase();

      await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email: username,
          },
          clientMetadata: {
            inviteCode: accessCode.trim(),
          },
        },
      });

      router.replace(`/admin/sign-up/confirm?email=${encodeURIComponent(username)}`);
    } catch (err: any) {
      setError(err?.message ?? "Admin sign-up failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          SW Tax Service • Admin
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Sign Up</h1>
        <p className="mt-1 text-sm text-slate-600">
          Requires an Admin Access Code.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Admin email</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Admin access code</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              autoComplete="one-time-code"
              required
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Creating..." : "Create admin account"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/admin/sign-in" className="text-slate-600 hover:underline">
            Admin sign-in
          </Link>
          <Link href="/" className="text-slate-600 hover:underline">
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
