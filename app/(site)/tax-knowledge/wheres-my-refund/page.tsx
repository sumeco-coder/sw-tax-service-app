// app/tax-knowledge/wheres-my-refund/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Where’s My Refund? IRS Status Guide | SW Tax Service",
  description:
    "Understand IRS refund statuses, typical timelines, and what to do if your refund is delayed or needs identity verification.",
};

export const dynamic = "force-static";

export default function WheresMyRefundPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10">
      <article className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">Tax Knowledge</p>
          <h1 className="text-3xl font-semibold">Where’s My Refund?</h1>
          <p className="text-muted-foreground">
            A simple guide to IRS refund statuses, timelines, and what delays usually mean.
          </p>
        </header>

        <section className="rounded-2xl border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Refund status usually shows 3 steps</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><span className="font-medium text-foreground">Return Received</span>: IRS has your return and it’s in the system.</li>
            <li><span className="font-medium text-foreground">Refund Approved</span>: IRS finished processing and scheduled the refund.</li>
            <li><span className="font-medium text-foreground">Refund Sent</span>: Refund was issued (direct deposit or mailed check).</li>
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Common reasons refunds get delayed</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>Identity verification (letters like 5071C / 4883C / “ID Verify” prompts)</li>
            <li>Missing documents (W-2/1099 mismatch, withholding verification)</li>
            <li>EITC/ACTC credits (often held for extra review depending on timing)</li>
            <li>Return selected for review or error correction</li>
            <li>Bank rejected direct deposit (name mismatch, closed account, etc.)</li>
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">What you should do</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Check your IRS refund status once per day (multiple checks won’t speed it up).</li>
            <li>If you received an IRS letter, follow the letter instructions exactly.</li>
            <li>If direct deposit fails, watch for a mailed check or IRS update.</li>
            <li>If you’re stuck in the same status for a long time, contact your preparer with your details.</li>
          </ol>
        </section>

        <section className="rounded-2xl border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Need help?</h2>
          <p className="text-sm text-muted-foreground">
            If you filed with SW Tax Service and your status hasn’t moved, message us from your portal
            (or contact support) and we’ll check what’s going on.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium"
            >
              Sign in to portal
            </Link>
            <a
              href="mailto:support@swtaxservice.com"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium"
            >
              Email support
            </a>
          </div>
        </section>

        <footer className="text-xs text-muted-foreground">
          Educational info only — not tax advice. Timelines vary by IRS workload and return details.
        </footer>
      </article>
    </main>
  );
}
