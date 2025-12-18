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
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-secondary via-background to-background px-6 pt-20 pb-16 text-center sm:px-8 lg:px-10">
        {/* Decorative gradient orb (your brand gradient) */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 transform-gpu blur-3xl"
          aria-hidden="true"
        >
          <div
            className="aspect-[1155/678] w-[72rem] opacity-35"
            style={{ background: "var(--brand-gradient)" }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            File Confidently — Maximize Your Refund with{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--brand-gradient)" }}
            >
              SW Tax Service
            </span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Professional tax prep for individuals, self-employed, and small
            businesses. File online or in-person with secure e-file and
            transparent pricing.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              href="/waitlist"
              className="inline-flex cursor-pointer items-center justify-center rounded-xl px-6 py-3 text-base font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              style={{ background: "var(--brand-gradient)" }}
            >
              Join the Waitlist
            </Link>

            <a
              href="/docs/tax-checklist.pdf"
              className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-base font-semibold text-foreground hover:bg-muted/40 hover:shadow-sm transition-all"
            >
              Download Checklist (PDF)
            </a>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            PTIN/EFIN on file • Bank-level encryption • Virtual &amp; In-Person
            Support
          </div>
        </div>

        {/* Bottom curved divider (matches your light section color) */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="oklch(97.52% 0.01507 345.136)" /* your --secondary */
            d="M0,64L60,85.3C120,107,240,149,360,160C480,171,600,149,720,133.3C840,117,960,107,1080,96C1200,85,1320,75,1380,69.3L1440,64V120H0Z"
          />
        </svg>
      </section>

      {/* TOP BANNER (brand colors) */}
      <header
        className="relative overflow-hidden text-primary-foreground py-12 text-center shadow-sm"
        style={{ background: "var(--brand-gradient)" }}
      >
        {/* soft highlight / glow */}
        <div
          className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.45),transparent_60%)]"
          aria-hidden="true"
        />

        {/* subtle bottom fade */}
        <div
          className="absolute inset-0 opacity-20 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.25))]"
          aria-hidden="true"
        />

        <div className="relative z-10 px-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm">
            Tax Preparer Assistance
          </h2>

          <p className="mt-3 text-base sm:text-lg text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            Get help from certified professionals — online or in-person, safely
            and securely.
          </p>
        </div>
      </header>

      {/* BENEFITS (brand colors) */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 overflow-hidden">
        {/* soft background using your theme */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background"
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 right-[-80px] h-72 w-72 rounded-full blur-3xl opacity-30"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 left-[-80px] h-72 w-72 rounded-full bg-accent/30 blur-3xl opacity-30"
        />

        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-foreground mb-3">
            Why Clients Choose SW Tax Service
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Clear pricing, real expertise, and year-round support — backed by
            secure systems.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                t: "Transparent Pricing",
                d: "Know what you’ll pay up front. No hidden fees.",
                icon: (
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
                      d="M12 8c-1.657 0-3 .843-3 1.882C9 11.157 10.343 12 12 12s3 .843 3 1.882C15 15.157 13.657 16 12 16m0-8v8m-9 4h18"
                    />
                  </svg>
                ),
              },
              {
                t: "Self-Employed Expertise",
                d: "1099s, mileage, write-offs — we understand your workflow.",
                icon: (
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
                    className="h-6 w-6"
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
                d: "Your data is protected in transit and at rest.",
                icon: (
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
                ),
              },
            ].map((f) => (
              <div
                key={f.t}
                className="group rounded-2xl border border-border bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                  {f.icon}
                </div>

                <h3 className="text-lg font-semibold text-foreground text-center">
                  {f.t}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground text-center leading-relaxed">
                  {f.d}
                </p>

                {/* tiny brand underline on hover */}
                <div
                  className="mx-auto mt-5 h-1 w-0 rounded-full transition-all duration-300 group-hover:w-16"
                  style={{ background: "var(--brand-gradient)" }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO WE SERVE (brand colors) */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 overflow-hidden">
        {/* soft background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-background via-secondary/50 to-background"
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 left-[-80px] h-72 w-72 rounded-full blur-3xl opacity-25"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 right-[-90px] h-80 w-80 rounded-full bg-accent/25 blur-3xl opacity-25"
        />

        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground text-center mb-3">
            Who We Serve
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Built for everyday taxpayers and busy business owners.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Individuals & Families",
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a4 4 0 00-4-4h-1m-2-4a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 20v-2a4 4 0 014-4h4"
                    />
                  </svg>
                ),
              },
              {
                label: "Self-Employed / 1099",
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 21h8m-4-4v4m0-4a8 8 0 100-16 8 8 0 000 16z"
                    />
                  </svg>
                ),
              },
              {
                label: "Small Business (Schedule C)",
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h18v4H3zM5 7h14v14H5z"
                    />
                  </svg>
                ),
              },
              {
                label: "Students & First-Time Filers",
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l9-5-9-5-9 5 9 5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14v7m0 0l3-2m-3 2l-3-2"
                    />
                  </svg>
                ),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="group relative flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary transition-all group-hover:bg-secondary/80">
                  {s.icon}
                </div>

                <p className="text-foreground font-semibold text-center leading-snug">
                  {s.label}
                </p>

                {/* brand underline */}
                <div
                  className="mt-5 h-1 w-0 rounded-full transition-all duration-300 group-hover:w-14"
                  style={{ background: "var(--brand-gradient)" }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES (brand colors) */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 overflow-hidden">
        {/* soft background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-background via-secondary/50 to-background"
        />
        <div
          aria-hidden="true"
          className="absolute -top-24 left-[-90px] h-80 w-80 rounded-full blur-3xl opacity-25"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 right-[-110px] h-96 w-96 rounded-full bg-accent/25 blur-3xl opacity-25"
        />

        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground text-center mb-3">
            Packages
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Choose a starting point. Final pricing depends on forms and
            complexity.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Basic",
                price: "Starting at $XX",
                badge: null,
                pts: [
                  "W-2 only",
                  "Standard deduction",
                  "E-file & status updates",
                ],
                cta: "Get Started",
                href: "/waitlist",
              },
              {
                name: "Plus",
                price: "Starting at $XX",
                badge: "Most Popular",
                pts: [
                  "W-2 + common credits",
                  "1098/1099-INT/DIV",
                  "E-file & review call",
                ],
                cta: "Join the Waitlist",
                href: "/waitlist",
                featured: true,
              },
              {
                name: "Self-Employed",
                price: "Starting at $XX",
                badge: null,
                pts: [
                  "Schedule C",
                  "Expenses & mileage",
                  "Home office (if eligible)",
                ],
                cta: "Get a Quote",
                href: "/waitlist",
              },
            ].map((p) => (
              <div
                key={p.name}
                className={[
                  "group relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-md",
                  p.featured ? "ring-1 ring-primary/20" : "",
                ].join(" ")}
              >
                {/* Accent top strip */}
                <div
                  className="absolute inset-x-0 -top-0.5 h-1 rounded-t-2xl opacity-90"
                  style={{ background: "var(--brand-gradient)" }}
                />

                {/* Badge */}
                {p.badge && (
                  <div
                    className="absolute -top-3 right-4 rounded-full px-3 py-1 text-xs font-semibold text-white shadow"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    {p.badge}
                  </div>
                )}

                {/* Header */}
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    {p.name}
                  </h3>
                  <div className="text-sm font-medium text-muted-foreground">
                    {p.price}
                  </div>
                </div>

                {/* Features */}
                <ul className="mt-4 space-y-2 text-sm text-foreground/80">
                  {p.pts.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-primary">
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414l2.293 2.293 6.543-6.543a1 1 0 0 1 1.414 0z" />
                        </svg>
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={p.href}
                  className={[
                    "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 font-semibold transition-all",
                    p.featured
                      ? "text-white shadow-sm hover:opacity-95"
                      : "border border-border bg-background text-foreground hover:bg-secondary/60",
                  ].join(" ")}
                  style={
                    p.featured
                      ? { background: "var(--brand-gradient)" }
                      : undefined
                  }
                >
                  {p.cta}
                </Link>

                {/* subtle hover ring */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-primary/0 transition group-hover:ring-8 group-hover:ring-primary/5" />
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            You’ll receive a clear quote before e-file.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS (brand colors) */}
      <section className="relative mx-auto max-w-6xl px-6 pt-14 pb-16 overflow-hidden">
        {/* soft background */}
        <div aria-hidden="true" className="absolute inset-0 bg-secondary/40" />

        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground text-center mb-3">
            How It Works
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Simple, secure, and guided from start to finish.
          </p>

          <ol className="grid gap-6 md:grid-cols-4">
            {[
              {
                title: "Join the Waitlist",
                desc: "Complete a quick intake form so we can match you with the right preparer.",
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
                desc: "Once you approve, we e-file and keep you updated on next steps.",
              },
            ].map((step, i) => (
              <li
                key={i}
                className="relative flex flex-col items-center rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* step number */}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-white font-extrabold text-base shadow-sm"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  {i + 1}
                </div>

                <h3 className="mt-4 text-lg font-semibold text-foreground text-center">
                  {step.title}
                </h3>

                <p className="mt-2 text-center text-muted-foreground text-sm leading-relaxed">
                  {step.desc}
                </p>

                {/* connecting line (desktop) */}
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 right-[-18px] w-9 h-[2px] bg-border" />
                )}

                {/* subtle hover ring */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-primary/0 transition group-hover:ring-8 group-hover:ring-primary/5" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PROOF / TESTIMONIALS (brand colors) */}
      <section className="relative mx-auto max-w-6xl px-6 pt-14 pb-16 overflow-hidden">
        {/* soft background tint */}
        <div aria-hidden="true" className="absolute inset-0 bg-background" />

        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground text-center mb-3">
            What Our Clients Say
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Real feedback from clients who filed with confidence.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
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
                className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* quote icon */}
                <svg
                  className="absolute top-4 left-4 h-6 w-6 text-primary/20"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M7.17 6A4.17 4.17 0 0 0 3 10.17V21h6v-7H5v-3.83A2.17 2.17 0 0 1 7.17 8H9V6H7.17ZM17.17 6A4.17 4.17 0 0 0 13 10.17V21h6v-7h-4v-3.83A2.17 2.17 0 0 1 17.17 8H19V6h-1.83Z" />
                </svg>

                <blockquote className="mt-6 text-foreground/90 italic leading-relaxed">
                  “{c.t}”
                </blockquote>

                <figcaption className="mt-4 text-sm font-semibold text-foreground">
                  {c.n}
                </figcaption>

                {/* subtle hover glow */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-primary/0 group-hover:ring-8 group-hover:ring-primary/5 transition" />
              </figure>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/waitlist"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold text-white shadow-sm hover:opacity-95"
              style={{ background: "var(--brand-gradient)" }}
            >
              Join the Waitlist
            </Link>

            <p className="mt-3 text-xs text-muted-foreground">
              Limited spots during peak season.
            </p>
          </div>
        </div>
      </section>

      {/* CHECKLIST (brand colors) */}
      <section className="relative mx-auto max-w-6xl px-6 pt-14 pb-16 overflow-hidden">
        {/* soft background */}
        <div aria-hidden="true" className="absolute inset-0 bg-background" />

        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-foreground mb-3">
            What to Bring
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Bring these items so we can file accurately and maximize your
            refund.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Card */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow">
              {/* Identity */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Identity
                </h3>
              </div>
              <ul className="list-disc pl-5 text-foreground/80 leading-relaxed">
                <li>Photo ID, SSN/ITIN for all filers &amp; dependents</li>
              </ul>

              {/* Income */}
              <div className="flex items-center gap-3 mt-8 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Income
                </h3>
              </div>
              <ul className="list-disc pl-5 text-foreground/80 leading-relaxed">
                <li>W-2, 1099-NEC/MISC, 1099-INT/DIV, K-1</li>
                <li>Other income statements or records</li>
              </ul>
            </div>

            {/* Right Card */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Deductions &amp; Credits
                </h3>
              </div>

              <ul className="list-disc pl-5 text-foreground/80 leading-relaxed">
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
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                style={{ background: "var(--brand-gradient)" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
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
        </div>
      </section>

      {/* SECURITY & COMPLIANCE (brand colors) */}
      <section className="relative mx-auto max-w-6xl px-6 pt-14 pb-16 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-background" />

        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-foreground mb-3">
            Security &amp; Compliance
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Built for privacy, accuracy, and secure client handling end-to-end.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c0 1.657-1.343 3-3 3s-3-1.343-3-3V8a3 3 0 116 0v3zm-6 4h12M9 21h6"
                  />
                </svg>
              </div>

              <h3 className="font-semibold text-foreground">
                Bank-Level Encryption
              </h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                Your data is encrypted in transit and at rest using the same
                standards trusted by financial institutions.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2l4-4m6 2a9 9 0 11-18 0a9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h3 className="font-semibold text-foreground">
                Multi-Factor Authentication
              </h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                Added account security with MFA support to help protect client
                logins and sensitive files.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6l4 2m6 0a9 9 0 11-18 0a9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h3 className="font-semibold text-foreground">
                Compliance &amp; Credentials
              </h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                PTIN &amp; EFIN registered. Returns follow IRS and state e-file
                compliance standards.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
                <a
                  href="/privacy"
                  className="font-semibold text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                <span className="text-muted-foreground/60">•</span>
                <a
                  href="/engagement-letter"
                  className="font-semibold text-primary hover:underline"
                >
                  Engagement Letter
                </a>
              </div>

              <div className="mt-5 w-full">
                <a
                  href="/waitlist"
                  className="inline-flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  Get Started Securely
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ (brand colors) */}
      <section className="relative mx-auto max-w-6xl px-6 pt-14 pb-20 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-background" />

        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-foreground mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Quick answers to common questions about filing, pricing, and next
            steps.
          </p>

          <div className="rounded-2xl border border-border bg-card shadow-sm divide-y divide-border overflow-hidden">
            {faqs.map((f, i) => (
              <details key={i} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 font-semibold text-foreground hover:bg-muted/40 transition-colors">
                  <span className="text-base">{f.q}</span>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground group-hover:text-primary transition-colors">
                    <svg
                      className="h-5 w-5 group-open:rotate-180 transition-transform duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </summary>

                <div className="px-6 pb-5 text-muted-foreground leading-relaxed">
                  {f.a}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href="/waitlist"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold text-white shadow-sm hover:opacity-95"
              style={{ background: "var(--brand-gradient)" }}
            >
              Still have questions? Join the Waitlist
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <div
          className="relative overflow-hidden rounded-3xl p-10 shadow-lg"
          style={{ background: "var(--brand-gradient)" }}
        >
          {/* subtle overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_left,white,transparent_70%)]" />

          <div className="relative text-center text-white">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Be First When Appointments Open
            </h2>

            <p className="mt-3 max-w-2xl mx-auto text-white/85 text-base sm:text-lg">
              Join the waitlist for priority scheduling, early access, and tax
              season updates.
            </p>

            <Link
              href="/waitlist"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-white/95 px-6 py-3 font-semibold text-blue-900 shadow-md backdrop-blur transition-all hover:bg-white hover:shadow-lg hover:scale-[1.03]"
            >
              Join the Waitlist
            </Link>

            <div className="mt-4 text-xs text-white/80">
              No spam — just real updates and early booking notifications.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
