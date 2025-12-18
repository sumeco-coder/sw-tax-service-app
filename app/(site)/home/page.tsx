// app/(site)/home/page.tsx
"use client";

import Link from "next/link";
import { useRef } from "react";
import Image from "next/image";
import { FaCheckCircle, FaUserTie, FaBookOpen } from "react-icons/fa";
import { SubscribeSection } from "../subscribe/_components/subscribers/SubscribeSection";

export default function HomePage() {
  const servicesRef = useRef<HTMLDivElement>(null);
  const knowledgeRef = useRef<HTMLDivElement>(null);

  const scrollToServices = () => {
    if (servicesRef.current) {
      servicesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section
        className="relative min-h-[60vh] md:min-h-[72vh] flex items-center justify-center bg-cover bg-center text-white"
        style={{ backgroundImage: "url('/assets/images/tax-background.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 text-center px-6 md:px-12">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            SW Tax <span className="text-primary">Service</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-white/85 leading-relaxed">
            Fast, secure online tax filing — DIY e-filing, expert help, and
            training for tax pros.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={scrollToServices}
              type="button"
              className="px-8 py-3 rounded-full border border-white/25 bg-white/10 backdrop-blur hover:bg-white/15 transition"
            >
              View Services
            </button>

            <Link
              href="/taxpayer-signup"
              className="px-8 py-3 rounded-full font-semibold text-white shadow-sm hover:opacity-95"
              style={{ background: "var(--brand-gradient)" }}
            >
              File Taxes Now
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        ref={servicesRef}
        aria-labelledby="services-heading"
        className="py-20 px-6 md:px-8"
      >
        <div className="max-w-6xl mx-auto text-center">
          <h2
            id="services-heading"
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground"
          >
            Our Services
          </h2>
          <p className="mt-4 text-muted-foreground">
            Explore our tax solutions and learning platform.
          </p>

          <div className="mt-12 grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* DIY Tax Filing */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-xl">
              <div className="p-8 flex flex-col items-center text-center">
                <FaCheckCircle className="text-primary text-4xl mb-4 transition-transform duration-300 group-hover:scale-110" />

                <h3 className="text-xl font-semibold text-foreground">
                  DIY Tax Filing
                </h3>

                <p className="mt-2 text-muted-foreground">
                  E-file your taxes quickly and securely.
                </p>

                <Link
                  href="/tax-filing"
                  className="mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[1px]"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  Learn More
                </Link>
              </div>

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "var(--brand-gradient)" }}
              />
            </div>

            {/* Tax Preparer Assistance */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-xl">
              <div className="p-8 flex flex-col items-center text-center">
                <FaUserTie className="text-primary text-4xl mb-4 transition-transform duration-300 group-hover:scale-110" />

                <h3 className="text-xl font-semibold text-foreground">
                  Tax Preparer Assistance
                </h3>

                <p className="mt-2 text-muted-foreground">
                  Get expert help from a tax professional.
                </p>

                <Link
                  href="/tax-preparer"
                  className="mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[1px]"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  Learn More
                </Link>
              </div>

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "var(--brand-gradient)" }}
              />
            </div>

            {/* LMS for Tax Pros */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-xl">
              <div className="p-8 flex flex-col items-center text-center">
                <FaBookOpen className="text-primary text-4xl mb-4 transition-transform duration-300 group-hover:scale-110" />

                <h3 className="text-xl font-semibold text-foreground">
                  LMS for Tax Pros
                </h3>

                <p className="mt-2 text-muted-foreground">
                  Courses & certifications for tax professionals.
                </p>

                <Link
                  href="/lms"
                  className="mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[1px]"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  Learn More
                </Link>
              </div>

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "var(--brand-gradient)" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Knowledge Section */}
      <section
        ref={knowledgeRef}
        aria-labelledby="knowledge-heading"
        className="relative bg-secondary/40 py-20 px-6 md:px-8 text-center overflow-hidden"
      >
        {/* soft background accents (brand) */}
        <div className="absolute -top-10 right-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-16 left-0 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <h2
            id="knowledge-heading"
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground"
          >
            Tax Knowledge Hub
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-muted-foreground">
            Stay informed with essential tax tips, updates, and business
            insights.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {/* Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-xl">
              <div className="relative w-full overflow-hidden rounded-t-2xl h-44 sm:h-52 md:h-56 lg:h-60">
                <Image
                  src="/assets/images/tax-deduction.png"
                  alt="Tax Deduction"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={false}
                />
              </div>

              <div className="p-6 text-left">
                <h3 className="text-xl font-semibold text-foreground">
                  Maximize Your Deductions
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Learn how to claim deductions and save more on your tax return
                  this year.
                </p>
              </div>

              <div
                className="absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "var(--brand-gradient)" }}
              />
            </div>

            {/* Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-xl">
              <div className="relative w-full overflow-hidden rounded-t-2xl h-44 sm:h-52 md:h-56 lg:h-60">
                <Image
                  src="/assets/images/tax-refund.png"
                  alt="Tax Refund"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={false}
                />
              </div>

              <div className="p-6 text-left">
                <h3 className="text-xl font-semibold text-foreground">
                  Track Your Refund
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Understand when and how you’ll receive your tax refund with
                  our quick guides.
                </p>
              </div>

              <div
                className="absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "var(--brand-gradient)" }}
              />
            </div>

            {/* Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-xl">
              <div className="relative w-full overflow-hidden rounded-t-2xl h-44 sm:h-52 md:h-56 lg:h-60">
                <Image
                  src="/assets/images/business-tax.png"
                  alt="Tax Refund"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={false}
                />
              </div>

              <div className="p-6 text-left">
                <h3 className="text-xl font-semibold text-foreground">
                  Tax Tips for Small Businesses
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Key insights and compliance strategies for business owners and
                  startups.
                </p>
              </div>

              <div
                className="absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "var(--brand-gradient)" }}
              />
            </div>
          </div>

          <div className="mt-12">
            <Link
              href="/tax-knowledge"
              className="inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ background: "var(--brand-gradient)" }}
            >
              Explore More
            </Link>
          </div>
        </div>
      </section>

      {/* Subscribe Section */}
      <section className="relative overflow-hidden py-20 px-6 text-center">
        <SubscribeSection />
      </section>

      {/* Book Appointment Section */}
      {/* Book Appointment Section (brand colors + pink CTA) */}
      <section className="relative overflow-hidden py-20 md:py-24 px-6 text-center text-primary-foreground">
        {/* background */}
        <div
          className="absolute inset-0"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div className="absolute inset-0 bg-black/10" />

        {/* soft glows */}
        <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Need a Tax Professional?
          </h2>

          <p className="mt-4 max-w-2xl mx-auto text-base md:text-lg text-white/90">
            Prefer an expert to handle it for you? Book an appointment with a
            certified tax preparer and get your taxes filed quickly, securely,
            and accurately.
          </p>

          <Link
            href="/appointment"
            className="inline-flex mt-10 items-center justify-center rounded-full px-8 py-4 text-base md:text-lg font-semibold
                 bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:opacity-95"
          >
            Book an Appointment
          </Link>

          <p className="mt-6 text-sm text-white/85">
            Virtual &amp; in-person consultations available.
          </p>
        </div>
      </section>
    </div>
  );
}
