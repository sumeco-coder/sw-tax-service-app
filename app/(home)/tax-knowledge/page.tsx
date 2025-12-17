// app/(home)/tax-knowledge/page.tsx
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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Tax Knowledge Center
          </h1>
          <p className="mt-2 text-slate-600">
            Simple guides, checklists, and tips to help you understand taxes and
            stay ready all year.
          </p>

          {/* Search (UI only for now) */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-xl border px-4 py-3 text-slate-900 outline-none ring-0 focus:border-slate-400"
              placeholder="Search topics (ex: EITC, dependents, 1099, mileage)..."
            />
            <Link
              href="/site/waitlist"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Join the waitlist
            </Link>
          </div>
        </div>

        {/* Featured */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Featured</h2>
            <Link className="text-sm font-semibold text-blue-700 hover:underline" href="/services">
              Work with SW Tax →
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-xs font-semibold text-slate-500">{a.tag}</div>
                <div className="mt-2 text-base font-semibold text-slate-900 group-hover:text-blue-700">
                  {a.title}
                </div>
                <div className="mt-3 text-sm font-semibold text-blue-700">
                  Read →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Browse topics</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {categories.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="text-lg font-semibold text-slate-900">{c.title}</div>
                <p className="mt-2 text-slate-600">{c.desc}</p>
                <div className="mt-3 text-sm font-semibold text-blue-700">Explore →</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="mt-10 rounded-2xl bg-slate-900 p-8 text-white">
          <h3 className="text-xl font-semibold">Want help filing?</h3>
          <p className="mt-2 text-slate-200">
            Join the waitlist and we’ll send your secure onboarding link when we open.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/site/waitlist"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-100"
            >
              Join the waitlist
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              View services
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
