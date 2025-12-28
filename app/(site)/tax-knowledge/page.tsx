// app/(site)/tax-knowledge/page.tsx
import Link from "next/link";

const categories = [
  {
    title: "Tax Basics",
    desc: "Filing status, dependents, W-2 vs 1099, standard vs itemized.",
    href: "/tax-knowledge/basics",
  },
  {
    title: "Deductions & Credits",
    desc: "Child Tax Credit, EITC, education, home office, mileage.",
    href: "/tax-knowledge/credits",
  },
  {
    title: "Small Business",
    desc: "Schedule C, write-offs, bookkeeping tips, estimated taxes.",
    href: "/tax-knowledge/business",
  },
  {
    title: "IRS Notices",
    desc: "What common IRS letters mean and what to do next.",
    href: "/tax-knowledge/irs-notices",
  },
];

const featured = [
  {
    title: "Top 10 documents to gather before you file",
    tag: "Getting Ready",
    href: "/tax-knowledge/docs-checklist",
  },
  {
    title: "What counts as a dependent?",
    tag: "Tax Basics",
    href: "/tax-knowledge/dependents",
  },
  {
    title: "Common write-offs for 1099 contractors",
    tag: "Small Business",
    href: "/tax-knowledge/1099-writeoffs",
  },
];

export default function TaxKnowledgePage() {
  return (
    <main className="min-h-screen bg-secondary/40">
  <div className="mx-auto max-w-6xl px-4 py-12">
    {/* Header */}
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Tax Knowledge Center
      </h1>
      <p className="mt-2 text-muted-foreground">
        Simple guides, checklists, and tips to help you understand taxes and
        stay ready all year.
      </p>

      {/* Search (UI only for now) */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none
                     focus:ring-2 focus:ring-ring"
          placeholder="Search topics (ex: EITC, dependents, 1099, mileage)..."
        />
        <Link
          href="/waitlist"
          className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold text-white shadow-sm hover:opacity-95
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ background: "var(--brand-gradient)" }}
        >
          Join the waitlist
        </Link>
      </div>
    </div>

    {/* Featured */}
    <section className="mt-10">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-semibold text-foreground">Featured</h2>
        <Link className="text-sm font-semibold text-primary hover:underline" href="/services">
          Work with SW Tax →
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition
                       hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-xs font-semibold text-muted-foreground">{a.tag}</div>

            <div className="mt-2 text-base font-semibold text-foreground group-hover:text-primary">
              {a.title}
            </div>

            <div className="mt-3 text-sm font-semibold text-primary">
              Read →
            </div>
          </Link>
        ))}
      </div>
    </section>

    {/* Categories */}
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-foreground">Browse topics</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="text-lg font-semibold text-foreground">{c.title}</div>
            <p className="mt-2 text-muted-foreground">{c.desc}</p>
            <div className="mt-3 text-sm font-semibold text-primary">Explore →</div>
          </Link>
        ))}
      </div>
    </section>

    {/* Footer CTA */}
    <section
      className="mt-10 rounded-2xl p-8 text-primary-foreground"
      style={{ background: "var(--brand-gradient)" }}
    >
      <h3 className="text-xl font-semibold">Want help filing?</h3>
      <p className="mt-2 text-primary-foreground/85">
        Join the waitlist and we’ll send your secure onboarding link when we open.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/waitlist"
          className="inline-flex items-center justify-center rounded-xl bg-card px-5 py-3 font-semibold text-foreground
                     hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Join the waitlist
        </Link>

        <Link
          href="/services"
          className="inline-flex items-center justify-center rounded-xl border border-white/30 px-5 py-3 font-semibold text-white
                     hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2"
        >
          View services
        </Link>
      </div>
    </section>
  </div>
</main>

  );
}
