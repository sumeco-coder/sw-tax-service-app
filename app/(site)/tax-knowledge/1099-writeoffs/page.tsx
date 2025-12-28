// app/(app)/tax-knowledge/writeoffs-1099/page.tsx
import Link from "next/link";

const categories = [
  {
    title: "Common expenses",
    items: [
      "Supplies and materials",
      "Software and subscriptions",
      "Business phone/internet (business portion)",
      "Marketing/advertising",
      "Professional services (bookkeeping, legal, contractor help)",
    ],
  },
  {
    title: "Vehicle & travel",
    items: [
      "Business mileage (keep a mileage log)",
      "Parking and tolls (business)",
      "Business travel (airfare, hotels) when primarily for work",
      "Meals may be limited—keep receipts and notes",
    ],
  },
  {
    title: "Home office (if eligible)",
    items: [
      "Dedicated workspace used regularly for business",
      "Portion of rent/mortgage interest, utilities, insurance (based on sq ft)",
      "Office supplies/furniture (depending on use and cost)",
    ],
  },
  {
    title: "Education",
    items: [
      "Courses/books that maintain or improve skills in your current business",
      "Licensing/CE fees (if related to your work)",
    ],
  },
];

export default function Writeoffs1099Page() {
  return (
   <main className="min-h-screen bg-secondary/40">
  <div className="mx-auto max-w-4xl px-4 py-12">
    <Link
      href="/tax-knowledge"
      className="text-sm font-semibold text-primary hover:underline"
    >
      ← Back to Tax Knowledge
    </Link>

    <div className="mt-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Common write-offs for 1099 contractors
      </h1>

      <p className="mt-2 text-muted-foreground">
        If you’re self-employed, you can often deduct ordinary and necessary
        business expenses. Here are common categories to track.
      </p>

      <div className="mt-8 space-y-4">
        {categories.map((c) => (
          <section
            key={c.title}
            className="rounded-2xl border border-border bg-secondary/60 p-6"
          >
            <h2 className="text-lg font-semibold text-foreground">{c.title}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
              {c.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div
        className="mt-8 rounded-2xl p-6 text-primary-foreground"
        style={{ background: "var(--brand-gradient)" }}
      >
        <div className="text-lg font-semibold">Pro tip</div>
        <p className="mt-1 text-primary-foreground/85">
          Keep receipts and a simple spreadsheet of totals by category. Good
          records reduce stress and maximize legitimate deductions.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/waitlist"
          className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold text-white shadow-sm hover:opacity-95
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ background: "var(--brand-gradient)" }}
        >
          Join the waitlist
        </Link>

        <Link
          href="/tax-knowledge/docs-checklist"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 font-semibold text-foreground hover:bg-muted
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Docs checklist →
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Note: This is general information and not tax advice for your specific
        situation.
      </p>
    </div>
  </div>
</main>

  );
}
