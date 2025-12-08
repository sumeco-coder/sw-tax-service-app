import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're on the Waitlist | SW Tax Service",
  description:
    "Thank you for joining the SW Tax Service waitlist. You’ll get an email and SMS invite when new spots open.",
};

export default function WaitlistThanksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-200 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <span className="text-emerald-600 text-xl">✓</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          You&apos;re on the waitlist 🎉
        </h1>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Thank you for joining the{" "}
          <span className="font-semibold">SW Tax Service</span> waitlist.
          <br />
          Once our waitlist opens, you&apos;ll receive both an{" "}
          <span className="font-semibold">email</span> and{" "}
          <span className="font-semibold">SMS invite</span> with your secure
          onboarding link.
        </p>

        <p className="mt-3 text-xs text-slate-500">
          Keep an eye on your inbox and phone — your spot in line is saved.
        </p>

        <div className="mt-6 space-y-2">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Back to home
          </Link>
          <Link
            href="/tax-knowledge"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Read tax tips while you wait
          </Link>
        </div>
      </div>
    </main>
  );
}
