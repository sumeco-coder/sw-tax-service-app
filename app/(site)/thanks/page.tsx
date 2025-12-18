import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're on the Waitlist | SW Tax Service",
  description:
    "Thank you for joining the SW Tax Service waitlist. You’ll get an email and SMS invite when new spots open.",
};

export default function WaitlistThanksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-lg border border-border p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <span className="text-primary text-xl">✓</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          You&apos;re on the waitlist 🎉
        </h1>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Thank you for joining the{" "}
          <span className="font-semibold text-foreground">SW Tax Service</span>{" "}
          waitlist.
          <br />
          Once our waitlist opens, you&apos;ll receive both an{" "}
          <span className="font-semibold text-foreground">email</span> and{" "}
          <span className="font-semibold text-foreground">SMS invite</span> with
          your secure onboarding link.
        </p>

        <p className="mt-3 text-xs text-muted-foreground">
          Keep an eye on your inbox and phone — your spot in line is saved.
        </p>

        <div className="mt-6 space-y-2">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ background: "var(--brand-gradient)" }}
          >
            Back to home
          </Link>

          <Link
            href="/tax-knowledge"
            className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Read tax tips while you wait
          </Link>
        </div>
      </div>
    </main>
  );
}
