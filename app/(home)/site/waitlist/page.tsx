// app/(site)/waitlist/page.tsx
import type { Metadata } from "next";
import WaitlistForm from "./waitlist-form";

export const metadata: Metadata = {
  title: "Join the Waitlist | SW Tax Service",
  description:
    "Get early access to SW Tax Service 2025 tax preparation openings. Join the waitlist.",
  alternates: { canonical: "/waitlist" },
  openGraph: {
    title: "Join the Waitlist | SW Tax Service",
    description:
      "Be first in line when we open new appointments. Priority access, no spam.",
    url: "/waitlist",
    type: "website",
  },
};

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      {/* Hero */}
      <section className="relative isolate overflow-hidden px-6 pt-24 pb-12 text-center sm:px-8">
        {/* decorative glow */}
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[72rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-300 to-indigo-200 opacity-30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 backdrop-blur">
            💸 2025 Tax Season <span className="text-blue-500">•</span> Priority Access
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Join the{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SW Tax Service
            </span>{" "}
            Waitlist
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Be first when new appointments open. Quick form, no spam, cancel anytime.
          </p>

          {/* trust row */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
            <span>Bank-level encryption</span>
            <span className="hidden sm:inline">•</span>
            <span>MFA available</span>
            <span className="hidden sm:inline">•</span>
            <span>PTIN/EFIN on file</span>
          </div>
        </div>
      </section>

      {/* Form Card */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-xl backdrop-blur sm:p-8">
          {/* subtle corner accents */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-indigo-200/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-blue-200/30 blur-2xl" />

          <WaitlistForm />

          <p className="mt-4 text-center text-xs text-gray-500">
            By joining, you agree to receive messages about booking openings and tax prep updates.
            You can opt out anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} SW Tax Service. All rights reserved.
      </footer>
    </main>
  );
}
