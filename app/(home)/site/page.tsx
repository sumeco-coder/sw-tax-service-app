"use client";

import Link from "next/link";
import { useRef } from "react";
import Image from "next/image";
import { FaCheckCircle, FaUserTie, FaBookOpen } from "react-icons/fa";

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
        className="relative min-h-[90vh] flex items-center justify-center bg-cover bg-center text-white"
        style={{
          backgroundImage: "url('/assets/images/tax-background.jpg')",
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/90 via-blue-900/80 to-blue-950/90"></div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 md:px-12">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            All-In-Well <span className="text-yellow-400">Tax Firm</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-gray-100 leading-relaxed">
            The complete solution for taxpayers and tax professionals —
            <strong className="text-yellow-300"> DIY e-filing</strong>, expert
            <strong className="text-yellow-300"> tax assistance</strong>, and
            <strong className="text-yellow-300"> professional training</strong>.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={scrollToServices}
              type="button"
              className="px-8 py-3 bg-white text-blue-900 font-semibold rounded-full shadow-lg hover:scale-105 hover:bg-gray-100 transition-transform duration-300"
            >
              View Services
            </button>

            <Link
              href="/taxpayer-signup"
              className="px-8 py-3 bg-yellow-400 text-blue-900 font-semibold rounded-full shadow-lg hover:bg-yellow-500 hover:scale-105 transition-transform duration-300"
            >
              File Taxes Now
            </Link>
          </div>
        </div>

        {/* Floating shapes for a modern feel */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
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
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900"
          >
            Our Services
          </h2>
          <p className="mt-4 text-gray-600">
            Explore our tax solutions and learning platform.
          </p>

          <div className="mt-12 grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* DIY Tax Filing */}
            <div className="group relative rounded-2xl border border-blue-100/60 bg-white/70 backdrop-blur-lg shadow-sm hover:shadow-xl transition-shadow duration-300">
              {/* gradient edge */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />
              <div className="p-8 flex flex-col items-center text-center">
                <FaCheckCircle className="text-blue-600 text-4xl mb-4 transition-transform duration-300 group-hover:scale-110" />
                <h3 className="text-xl font-semibold text-blue-900">
                  DIY Tax Filing
                </h3>
                <p className="mt-2 text-gray-600">
                  E-file your taxes quickly and securely.
                </p>

                <Link
                  href="/home/tax-filing"
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 font-medium text-white transition-all duration-300 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-[1px]"
                >
                  Learn More
                </Link>
              </div>
              {/* subtle bottom gradient */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r from-blue-500/60 via-blue-400/60 to-blue-600/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Tax Preparer Assistance */}
            <div className="group relative rounded-2xl border border-blue-100/60 bg-white/70 backdrop-blur-lg shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />
              <div className="p-8 flex flex-col items-center text-center">
                <FaUserTie className="text-blue-600 text-4xl mb-4 transition-transform duration-300 group-hover:scale-110" />
                <h3 className="text-xl font-semibold text-blue-900">
                  Tax Preparer Assistance
                </h3>
                <p className="mt-2 text-gray-600">
                  Get expert help from a tax professional.
                </p>

                <Link
                  href="/tax-preparer"
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 font-medium text-white transition-all duration-300 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-[1px]"
                >
                  Learn More
                </Link>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r from-blue-500/60 via-blue-400/60 to-blue-600/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* LMS for Tax Pros */}
            <div className="group relative rounded-2xl border border-blue-100/60 bg-white/70 backdrop-blur-lg shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />
              <div className="p-8 flex flex-col items-center text-center">
                <FaBookOpen className="text-blue-600 text-4xl mb-4 transition-transform duration-300 group-hover:scale-110" />
                <h3 className="text-xl font-semibold text-blue-900">
                  LMS for Tax Pros
                </h3>
                <p className="mt-2 text-gray-600">
                  Courses & certifications for tax professionals.
                </p>

                <Link
                  href="/lms"
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 font-medium text-white transition-all duration-300 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-[1px]"
                >
                  Learn More
                </Link>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r from-blue-500/60 via-blue-400/60 to-blue-600/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </section>

      {/* Knowledge Section */}
      <section
        ref={knowledgeRef}
        aria-labelledby="knowledge-heading"
        className="relative bg-gradient-to-b from-blue-50 to-blue-100 py-20 px-6 md:px-8 text-center overflow-hidden"
      >
        {/* Floating background accents */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-blue-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-200/30 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <h2
            id="knowledge-heading"
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-blue-900"
          >
            Tax Knowledge Hub
          </h2>
          <p className="mt-4 text-gray-700 max-w-2xl mx-auto">
            Stay informed with essential tax tips, updates, and business
            insights.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {/* Tax Deductions */}
            <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-md hover:shadow-xl transition-shadow duration-300 border border-blue-100/50">
              <div className="overflow-hidden">
                <Image
                  src="/assets/images/tax-deduction.png"
                  alt="Tax Deductions"
                  width={400}
                  height={250}
                  className="w-full h-56 object-cover rounded-t-2xl transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6 text-left">
                <h3 className="text-xl font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                  Maximize Your Deductions
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  Learn how to claim deductions and save more on your tax return
                  this year.
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Tax Refunds */}
            <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-md hover:shadow-xl transition-shadow duration-300 border border-blue-100/50">
              <div className="overflow-hidden">
                <Image
                  src="/assets/images/tax-refund.jpg"
                  alt="Tax Refunds"
                  width={400}
                  height={250}
                  className="w-full h-56 object-cover rounded-t-2xl transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6 text-left">
                <h3 className="text-xl font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                  Track Your Refund
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  Understand when and how you’ll receive your tax refund with
                  our quick guides.
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Small Business Taxes */}
            <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-md hover:shadow-xl transition-shadow duration-300 border border-blue-100/50">
              <div className="overflow-hidden">
                <Image
                  src="/assets/images/business-tax.jpg"
                  alt="Business Taxes"
                  width={400}
                  height={250}
                  className="w-full h-56 object-cover rounded-t-2xl transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6 text-left">
                <h3 className="text-xl font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                  Tax Tips for Small Businesses
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  Key insights and compliance strategies for business owners and
                  startups.
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="mt-12">
            <Link
              href="/tax-knowledge"
              className="inline-block px-8 py-3 bg-blue-700 text-white font-semibold rounded-full shadow-lg hover:bg-blue-800 hover:scale-105 transition-transform duration-300"
            >
              Explore More
            </Link>
          </div>
        </div>
      </section>

      {/* Subscribe Section */}
      <section className="relative bg-gradient-to-b from-gray-50 to-gray-100 py-24 px-6 text-center overflow-hidden">
        {/* Background accents */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-yellow-300/30 rounded-full blur-3xl animate-pulse"></div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-blue-900">
            Stay Updated
          </h2>
          <p className="mt-3 text-gray-700 text-lg">
            Join our mailing list for expert tax tips, latest IRS updates, and
            exclusive offers.
          </p>

          {/* Newsletter Form */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <input
              type="email"
              placeholder="Enter your email address"
              className="w-full sm:w-80 px-5 py-3 text-gray-800 bg-white border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-700 to-blue-500 text-white font-semibold rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-transform duration-300"
            >
              Subscribe
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-500">
            No spam, just helpful insights. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* Book Appointment Section */}
      <section className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white py-24 px-6 text-center overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Need a Tax Professional?
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            Prefer an expert to handle it for you? Book an appointment with a
            certified tax preparer and get your taxes filed quickly, securely,
            and accurately.
          </p>

          <Link
            href="/appointment"
            className="inline-block mt-10 px-8 py-4 bg-yellow-400 text-blue-900 font-semibold text-lg rounded-full shadow-lg hover:bg-yellow-300 hover:scale-105 transition-transform duration-300"
          >
            Book an Appointment
          </Link>

          <p className="mt-6 text-sm text-blue-100">
            Virtual & in-person consultations available.
          </p>
        </div>
      </section>
    </div>
  );
}
