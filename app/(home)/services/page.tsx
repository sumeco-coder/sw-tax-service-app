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
    <main className="bg-white">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 tracking-tight">
          Services
        </h1>
        <p className="mt-4 text-gray-700 max-w-2xl">
          Everything you need for a smooth tax season and clean books—plus a
          professional LMS training suite for tax pros.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/site/appointment"
            className="inline-flex items-center rounded-2xl border border-blue-900 px-5 py-2.5 text-blue-900 hover:bg-blue-50 transition"
          >
            Book Appointment
          </Link>
          <Link
            href="/site/lms"
            className="inline-flex items-center rounded-2xl bg-blue-900 px-5 py-2.5 text-white hover:opacity-90 transition"
          >
            Explore LMS for Tax Pros
          </Link>
        </div>
      </section>

      {/* Service Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {services.map((s) => (
            <article
              key={s.slug}
              className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-6"
            >
              <h2 className="text-2xl font-bold text-blue-900">{s.title}</h2>
              <p className="mt-2 text-gray-700">{s.blurb}</p>
              <ul className="mt-4 text-gray-700 space-y-1 list-disc list-inside">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between">
                <Link
                  href={s.slug}
                  className="rounded-xl bg-blue-900 text-white px-4 py-2 hover:opacity-90 transition"
                >
                  {s.cta}
                </Link>
                <Link
                  href="/site/appointment"
                  className="text-blue-900 underline underline-offset-4 hover:no-underline"
                >
                  Book now
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* LMS Block */}
      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-3xl">
                <h2 className="text-2xl md:text-3xl font-bold text-blue-900">
                  LMS for Tax Pros
                </h2>
                <p className="mt-2 text-gray-700">
                  Level up your tax practice with step‑by‑step courses, client
                  workflows, compliance checklists, and templates. Built by
                  practitioners to help you deliver premium service at scale.
                </p>
                <ul className="mt-4 text-gray-700 space-y-1 list-disc list-inside">
                  <li>Onboarding & discovery call scripts</li>
                  <li>Tax prep SOPs & quality‑control checklists</li>
                  <li>Client portals, engagement letters & templates</li>
                </ul>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link
                  href="/site/lms"
                  className="rounded-xl border border-blue-900 px-4 py-2 text-blue-900 hover:bg-blue-50 transition"
                >
                  Explore LMS
                </Link>
                <Link
                  href="/site/lms/enroll"
                  className="rounded-xl bg-blue-900 px-4 py-2 text-white hover:opacity-90 transition"
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
