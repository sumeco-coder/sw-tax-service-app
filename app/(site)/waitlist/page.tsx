// app/(home)/site/waitlist/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import WaitlistForm from "./_components/waitlist-form";

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

export const dynamic = "force-dynamic";

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary via-background to-background">
      {/* Hero */}
      <section className="relative isolate overflow-hidden px-6 pt-24 pb-12 text-center sm:px-8">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[72rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--brand-gradient)" }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-border backdrop-blur">
            💸 2025 Tax Season <span className="text-muted-foreground">•</span>{" "}
            Priority Access
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Join the{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--brand-gradient)" }}
            >
              SW Tax Service
            </span>{" "}
            Waitlist
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Be first when new appointments open. Quick form, no spam, cancel
            anytime.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
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
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur sm:p-8">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-accent/15 blur-2xl" />

          <Suspense fallback={null}>
            <WaitlistForm />
          </Suspense>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By joining, you agree to receive messages about booking openings and
            tax prep updates. You can opt out anytime.
          </p>
        </div>
      </section>
    </main>
  );
}
