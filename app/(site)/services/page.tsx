import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services • SW Tax Service",
  description:
    "Explore SW Tax Service offerings: Individual Tax Filing, Business Tax Setup, Bookkeeping, Amendments, and our LMS for Tax Pros.",
};

export default function ServicesPage() {
  const services = [
    {
      slug: "/site/individual-tax-filing",
      title: "Individual Tax Filing",
      blurb:
        "Fast, accurate e‑filing with year‑round support. We maximize credits and deductions while keeping you compliant.",
      bullets: [
        "1040 preparation and e‑file",
        "W‑2/1099 income, credits & deductions",
        "IRS transcript review & notice help",
      ],
      cta: "Learn more",
    },
    {
      slug: "/site/business-tax-setup",
      title: "Business Tax Setup",
      blurb:
        "From entity selection to EIN and state registration, we set your business up cleanly so tax season is smooth.",
      bullets: [
        "LLC/Corp selection guidance",
        "EIN + state registrations",
        "Bookkeeping & payroll readiness",
      ],
      cta: "Learn more",
    },
    {
      slug: "/site/bookkeeping",
      title: "Bookkeeping",
      blurb:
        "Clear, monthly books you can trust. Close your month with confidence and make tax time effortless.",
      bullets: [
        "Monthly categorization & reconciliations",
        "Financial statements (P&L, Balance Sheet)",
        "Receipt hub & year‑end package",
      ],
      cta: "Learn more",
    },
    {
      slug: "/site/amendments",
      title: "Amendments (1040‑X)",
      blurb:
        "Need to fix a past return? We correct errors, add missed forms/credits, and manage the IRS paper trail.",
      bullets: [
        "Return review & diagnosis",
        "Prepare & file Form 1040‑X",
        "Notices & follow‑through support",
      ],
      cta: "Learn more",
    },
  ] as const;

  return (
    <main className="bg-background text-foreground">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Services
        </h1>

        <p className="mt-4 max-w-2xl text-muted-foreground">
          Everything you need for a smooth tax season and clean books — plus a
          professional LMS training suite for tax pros.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/appointment"
            className="inline-flex items-center rounded-xl border border-border px-5 py-2.5 font-semibold
                   text-primary hover:bg-secondary transition"
          >
            Book Appointment
          </Link>

          <Link
            href="/lms"
            className="inline-flex items-center rounded-xl px-5 py-2.5 font-semibold text-primary-foreground
                   shadow-md transition hover:opacity-95"
            style={{ background: "var(--brand-gradient)" }}
          >
            Explore LMS for Tax Pros
          </Link>
        </div>
      </section>

      {/* Service Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {services.map((s) => (
            <article
              key={s.slug}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm
                     transition hover:shadow-md"
            >
              <h2 className="text-2xl font-bold">{s.title}</h2>

              <p className="mt-2 text-muted-foreground">{s.blurb}</p>

              <ul className="mt-4 space-y-1 list-disc list-inside text-muted-foreground">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between">
                <Link
                  href={s.slug}
                  className="rounded-xl px-4 py-2 font-semibold text-primary-foreground
                         shadow-md transition hover:opacity-95"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  {s.cta}
                </Link>

                <Link
                  href="/appointment"
                  className="text-primary font-semibold underline underline-offset-4
                         hover:no-underline"
                >
                  Book now
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* LMS Block */}
      <section className="bg-secondary border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-3xl">
                <h2 className="text-2xl md:text-3xl font-bold">
                  LMS for Tax Pros
                </h2>

                <p className="mt-2 text-muted-foreground">
                  Level up your tax practice with step-by-step courses, client
                  workflows, compliance checklists, and templates — built by
                  practitioners.
                </p>

                <ul className="mt-4 space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Onboarding & discovery call scripts</li>
                  <li>Tax prep SOPs & quality-control checklists</li>
                  <li>Client portals, engagement letters & templates</li>
                </ul>
              </div>

              <div className="flex gap-3 shrink-0">
                <Link
                  href="/lms"
                  className="rounded-xl border border-border px-4 py-2 font-semibold
                         text-primary hover:bg-secondary transition"
                >
                  Explore LMS
                </Link>

                <Link
                  href="/lms/enroll"
                  className="rounded-xl px-4 py-2 font-semibold text-primary-foreground
                         shadow-md transition hover:opacity-95"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  Enroll Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
