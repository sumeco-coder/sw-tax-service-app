// app/(site)/tax-preparer/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tax Preparer | SW Tax Service",
  description:
    "Professional tax preparation for individuals, self-employed, and small businesses. Transparent pricing, secure e-file, and year-round support.",
  alternates: { canonical: "/tax-preparer" },
  openGraph: {
    title: "Tax Preparer | SW Tax Service",
    description:
      "File fast, accurately, and keep every dollar you deserve — online or in-person.",
    url: "/tax-preparer",
    type: "website",
  },
};

export default function TaxPreparerPage() {
  const faqs = [
    {
      q: "Why should I use a tax preparer?",
      a: "Using a tax preparer ensures that your tax return is accurate and maximizes your refund. Our certified professionals stay up-to-date with the latest tax laws and can provide personalized advice based on your financial situation.",
    },
    {
      q: "How secure is my personal information?",
      a: "We prioritize the security and confidentiality of your personal data. Our systems use advanced encryption and security protocols to protect your information throughout the tax preparation process.",
    },
    {
      q: "How long does filing take?",
      a: "Simple returns are often ready within 24–48 hours once all documents are received.",
    },
    {
      q: "When will I get my refund?",
      a: "Most IRS refunds are issued within 7–21 days after acceptance (varies by credits and review).",
    },
    {
      q: "Do you help with back taxes or amendments?",
      a: "Yes. We prepare amendments, prior-year returns, and IRS notices support.",
    },
    {
      q: "What if I need help after filing?",
      a: "We offer year-round support for any tax questions or issues that may arise after filing.",
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* JSON-LD (SEO) */}
      <script
        type="application/ld+json"
        // Server components can safely render JSON-LD this way
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: "SW Tax Service",
            url: "https://your-domain.example/tax-preparer",
            areaServed: "US",
            serviceType: "Tax Preparation",
            sameAs: [
              "https://www.facebook.com/", // update if used
              "https://www.instagram.com/",
            ],
          }),
        }}
      />

     {/* HERO */}
<section className="relative isolate overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white px-6 pt-24 pb-20 text-center sm:px-8 lg:px-10">
  {/* Decorative gradient orb */}
  <div className="absolute -top-32 left-1/2 -translate-x-1/2 transform-gpu blur-3xl" aria-hidden="true">
    <div className="aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-blue-300 to-indigo-200 opacity-30" />
  </div>

  <div className="relative mx-auto max-w-4xl">
    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
      File Confidently — Maximize Your Refund with{" "}
      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        SW Tax Service
      </span>
    </h1>

    <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
      Professional tax prep for individuals, self-employed, and small businesses.
      File online or in-person with secure e-file and transparent pricing.
    </p>

    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
      <Link
        href="/waitlist"
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.03]"
      >
        Join the Waitlist
      </Link>

      <a
        href="/docs/tax-checklist.pdf"
        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-800 hover:bg-gray-50 hover:shadow-sm transition-all"
      >
        Download Checklist (PDF)
      </a>
    </div>

    <div className="mt-6 text-xs text-gray-500">
      PTIN/EFIN on file • Bank-level encryption • Virtual &amp; In-Person Support
    </div>
  </div>

  {/* Faint curved divider at bottom */}
  <svg
    className="absolute bottom-0 left-0 w-full text-blue-50"
    viewBox="0 0 1440 120"
    preserveAspectRatio="none"
  >
    <path
      fill="currentColor"
      d="M0,64L60,85.3C120,107,240,149,360,160C480,171,600,149,720,133.3C840,117,960,107,1080,96C1200,85,1320,75,1380,69.3L1440,64V120H1380C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120H0Z"
    />
  </svg>
</section>

      {/* TOP BANNER */}
<header className="relative overflow-hidden bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 text-white py-12 text-center shadow-md">
  {/* decorative accent orb */}
  <div
    className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.3),transparent_70%)]"
    aria-hidden="true"
  ></div>

  <div className="relative z-10">
    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight drop-shadow-md transition-transform hover:scale-[1.02]">
      Tax Preparer Assistance
    </h2>
    <p className="mt-3 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
      Get help from certified professionals — online or in-person, safely and securely.
    </p>
  </div>
</header>


{/* BENEFITS */}
<section className="mx-auto max-w-6xl px-6 pt-16 pb-20 bg-gradient-to-b from-blue-50 via-white to-purple-50">
  <h2 className="text-2xl font-semibold text-center text-gray-900 mb-10">
    Why Clients Choose SW Tax Service
  </h2>

  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
    {[
      {
        t: "Transparent Pricing",
        d: "Know what you’ll pay up front. No hidden fees, ever.",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .843-3 1.882C9 11.157 10.343 12 12 12s3 .843 3 1.882C15 15.157 13.657 16 12 16m0-8v8m-9 4h18"
            />
          </svg>
        ),
      },
      {
        t: "Self-Employed Expertise",
        d: "From mileage logs to 1099s, we understand your workflow.",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m2 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        t: "Year-Round Support",
        d: "We don’t disappear after tax season — we’re here all year.",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-purple-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        t: "Secure E-File",
        d: "Your data is encrypted in transit and at rest with bank-grade protection.",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c0 1.657-1.343 3-3 3s-3-1.343-3-3V8a3 3 0 116 0v3zm-6 4h12M9 21h6"
            />
          </svg>
        ),
      },
    ].map((f) => (
      <div
        key={f.t}
        className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-md hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all duration-300"
      >
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 mb-4 mx-auto group-hover:bg-blue-100">
          {f.icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center">
          {f.t}
        </h3>
        <p className="mt-2 text-gray-600 text-center leading-relaxed">
          {f.d}
        </p>
      </div>
    ))}
  </div>
</section>

   {/* WHO WE SERVE */}
<section className="mx-auto max-w-6xl px-6 pt-16 pb-20 bg-gradient-to-b from-white via-blue-50/40 to-purple-50/30">
  <h2 className="text-2xl font-semibold text-gray-900 text-center mb-10">
    Who We Serve
  </h2>

  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
    {[
      {
        label: "Individuals & Families",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1m-2-4a4 4 0 11-8 0 4 4 0 018 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 20v-2a4 4 0 014-4h4" />
          </svg>
        ),
      },
      {
        label: "Self-Employed / 1099",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8m-4-4v4m0-4a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        ),
      },
      {
        label: "Small Business (Schedule C)",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v4H3zM5 7h14v14H5z" />
          </svg>
        ),
      },
      {
        label: "Students & First-Time Filers",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7m0 0l3-2m-3 2l-3-2" />
          </svg>
        ),
      },
    ].map((s, i) => (
      <div
        key={i}
        className="group flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 shadow-md hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all duration-300"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 mb-4 group-hover:bg-blue-100 transition-all">
          {s.icon}
        </div>
        <p className="text-gray-800 font-medium text-center">{s.label}</p>
      </div>
    ))}
  </div>
</section>


    {/* PACKAGES */}
<section className="mx-auto max-w-6xl px-6 pt-16 pb-20 bg-gradient-to-b from-blue-50 via-white to-purple-50">
  <h2 className="text-2xl font-semibold text-gray-900 text-center mb-10">
    Packages
  </h2>

  <div className="grid gap-8 md:grid-cols-3">
    {[
      {
        name: "Basic",
        price: "Starting at $XX",
        badge: null,
        accent: "from-gray-100 to-gray-50",
        pts: ["W-2 only", "Standard deduction", "E-file & status updates"],
        cta: "Get Started",
      },
      {
        name: "Plus",
        price: "Starting at $XX",
        badge: "Most Popular",
        accent: "from-blue-50 to-indigo-50",
        pts: ["W-2 + common credits", "1098/1099-INT/DIV", "E-file & review call"],
        cta: "Join the Waitlist",
        featured: true,
      },
      {
        name: "Self-Employed",
        price: "Starting at $XX",
        badge: null,
        accent: "from-purple-50 to-pink-50",
        pts: ["Schedule C", "Expenses & mileage", "Home office (if eligible)"],
        cta: "Get a Quote",
      },
    ].map((p) => (
      <div
        key={p.name}
        className={[
          "group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300",
          "hover:-translate-y-1 hover:shadow-lg",
          p.featured ? "ring-1 ring-blue-500/20" : "",
        ].join(" ")}
      >
        {/* Accent top gradient strip */}
        <div className={`absolute inset-x-0 -top-0.5 h-1 rounded-t-2xl bg-gradient-to-r ${p.accent}`} />

        {/* Badge (Most Popular) */}
        {p.badge && (
          <div className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow">
            {p.badge}
          </div>
        )}

        {/* Header */}
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
          <div className="text-sm font-medium text-gray-700">{p.price}</div>
        </div>

        {/* Features */}
        <ul className="mt-4 space-y-2 text-gray-700">
          {p.pts.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                {/* check icon */}
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414l2.293 2.293 6.543-6.543a1 1 0 0 1 1.414 0z" />
                </svg>
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          href="/waitlist"
          className={[
            "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 font-semibold transition-all",
            p.featured
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md"
              : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50",
          ].join(" ")}
        >
          {p.cta}
        </Link>

        {/* Subtle hover glow ring */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-blue-500/0 group-hover:ring-8 group-hover:ring-blue-500/5 transition" />
      </div>
    ))}
  </div>

  <p className="mt-8 text-center text-sm text-gray-500">
    Final pricing depends on forms and complexity. You’ll receive a clear quote before e-file.
  </p>
</section>


      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-16 bg-gray-50">
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-10">
          How It Works
        </h2>

        <ol className="grid gap-8 md:grid-cols-4">
          {[
            {
              title: "Join the Waitlist",
              desc: "Complete a quick 5-minute intake form so we can match you with the right preparer.",
            },
            {
              title: "Upload Documents",
              desc: "Securely upload your tax forms and receipts through our encrypted portal.",
            },
            {
              title: "We Prepare & Review",
              desc: "A certified preparer reviews everything with you before submission.",
            },
            {
              title: "Approve & E-File",
              desc: "Once you approve, we file electronically and track your refund for you.",
            },
          ].map((step, i) => (
            <li
              key={i}
              className="relative flex flex-col items-center rounded-2xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-lg shadow-md">
                {i + 1}
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900 text-center">
                {step.title}
              </h3>
              <p className="mt-2 text-center text-gray-600 text-sm leading-relaxed">
                {step.desc}
              </p>

              {/* connecting line for larger screens */}
              {i < 3 && (
                <div className="hidden md:block absolute top-6 right-[-20px] w-10 h-[2px] bg-blue-100"></div>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* PROOF / TESTIMONIALS */}
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-16 bg-white">
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-10">
          What Our Clients Say
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              n: "A.M. — Las Vegas",
              t: "Fast, friendly, and I understood every step. Highly recommend SW Tax Service!",
            },
            {
              n: "J.W. — Remote",
              t: "Handled my 1099 income with ease. The secure portal made everything so simple.",
            },
            {
              n: "S.R. — Small Biz",
              t: "Transparent pricing and quick turnaround. My go-to tax pros from now on.",
            },
          ].map((c) => (
            <figure
              key={c.n}
              className="relative rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <svg
                className="absolute top-4 left-4 h-6 w-6 text-blue-200"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M7.17 6A4.17 4.17 0 0 0 3 10.17V21h6v-7H5v-3.83A2.17 2.17 0 0 1 7.17 8H9V6H7.17ZM17.17 6A4.17 4.17 0 0 0 13 10.17V21h6v-7h-4v-3.83A2.17 2.17 0 0 1 17.17 8H19V6h-1.83Z" />
              </svg>
              <blockquote className="mt-6 text-gray-800 italic leading-relaxed">
                “{c.t}”
              </blockquote>
              <figcaption className="mt-4 text-sm font-medium text-gray-700">
                {c.n}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="/waitlist"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Join the Waitlist
          </a>
        </div>
      </section>

      {/* CHECKLIST */}
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-16 bg-gradient-to-b from-blue-50 via-white to-white">
        <h2 className="text-2xl font-semibold text-center text-gray-900 mb-10">
          What to Bring
        </h2>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Left Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Identity</h3>
            </div>
            <ul className="list-disc pl-5 text-gray-700 leading-relaxed">
              <li>Photo ID, SSN/ITIN for all filers & dependents</li>
            </ul>

            <div className="flex items-center gap-3 mt-6 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Income</h3>
            </div>
            <ul className="list-disc pl-5 text-gray-700 leading-relaxed">
              <li>W-2, 1099-NEC/MISC, 1099-INT/DIV, K-1</li>
              <li>Other income statements or records</li>
            </ul>
          </div>

          {/* Right Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Deductions &amp; Credits
              </h3>
            </div>
            <ul className="list-disc pl-5 text-gray-700 leading-relaxed">
              <li>
                Childcare, education (1098-T), medical expenses, 1098 mortgage
              </li>
              <li>Charitable donations &amp; receipts</li>
              <li>
                Self-employed: expense summary, mileage, home office details
              </li>
            </ul>

            <a
              href="/docs/tax-checklist.pdf"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Download Full Checklist (PDF)
            </a>
          </div>
        </div>
      </section>

      {/* SECURITY & COMPLIANCE */}
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-16 bg-gradient-to-b from-gray-50 via-white to-white">
        <h2 className="text-2xl font-semibold text-center text-gray-900 mb-10">
          Security &amp; Compliance
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-md flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 11c0 1.657-1.343 3-3 3s-3-1.343-3-3V8a3 3 0 116 0v3zm-6 4h12M9 21h6"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">
              Bank-Level Encryption
            </h3>
            <p className="mt-2 text-gray-600 text-sm leading-relaxed">
              Your data is encrypted in transit and at rest using the same
              technology trusted by financial institutions.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-md flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2l4-4m6 2a9 9 0 11-18 0a9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">
              Multi-Factor Authentication
            </h3>
            <p className="mt-2 text-gray-600 text-sm leading-relaxed">
              Added security for your account and files with MFA protection on
              all client logins.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-md flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6l4 2m6 0a9 9 0 11-18 0a9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">
              Compliance &amp; Credentials
            </h3>
            <p className="mt-2 text-gray-600 text-sm leading-relaxed">
              PTIN &amp; EFIN registered. All returns follow IRS and state
              e-file compliance standards.{" "}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>{" "}
              &nbsp;|&nbsp;{" "}
              <a
                href="/engagement-letter"
                className="text-blue-600 hover:underline"
              >
                Engagement Letter
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-20 bg-gradient-to-b from-blue-50 via-white to-purple-50">
        <h2 className="text-2xl font-semibold text-center text-gray-900 mb-10">
          Frequently Asked Questions
        </h2>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-md divide-y divide-gray-100">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group transition-all duration-300 ease-in-out hover:bg-blue-50/30"
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-medium text-gray-900 hover:text-blue-700 transition-colors">
                <span>{f.q}</span>
                <svg
                  className="h-5 w-5 text-gray-400 group-open:rotate-180 transition-transform duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-6 pb-5 text-gray-700 leading-relaxed bg-gradient-to-r from-blue-50/40 to-purple-50/40 rounded-b-2xl">
                {f.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="/waitlist"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 font-semibold text-white hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Still have questions? Join the Waitlist
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-10 shadow-lg">
          {/* subtle overlay pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_left,white,transparent_70%)]"></div>

          <div className="relative text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Be First When Appointments Open
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-blue-100 text-base sm:text-lg">
              Join the waitlist for priority scheduling, early access, and tax
              season updates.
            </p>

            <Link
              href="/waitlist"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-white/90 px-6 py-3 font-semibold text-blue-700 shadow-md backdrop-blur transition-all hover:bg-white hover:shadow-lg hover:scale-[1.03]"
            >
              Join the Waitlist
            </Link>

            <div className="mt-4 text-xs text-blue-100">
              No spam — just real updates and early booking notifications.
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} SW Tax Service. All rights reserved.
      </footer>
    </main>
  );
}
