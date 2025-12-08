"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { FaCheckCircle, FaPlayCircle, FaLock, FaUserTie } from "react-icons/fa";

// Simple FAQ item component
function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-blue-100 rounded-2xl bg-white/80">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 text-left"
      >
        <span className="text-sm sm:text-base font-semibold text-blue-900">
          {question}
        </span>
        <span className="ml-4 text-xl text-[#bb4823]">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 text-sm text-gray-700">
          {answer}
        </div>
      )}
    </div>
  );
}

export function LmsForTaxProsClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Hook this up to your backend / API route / Airtable / etc.
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          {/* Text */}
          <div className="flex-1">
            <p className="inline-flex items-center text-xs font-semibold tracking-wide uppercase text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
              SW Tax Service • LMS for Tax Pros
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-900 leading-tight">
              Train, Onboard & Scale Your
              <span className="block text-[#bb4823]">
                Tax Prep Team in One Place.
              </span>
            </h1>
            <p className="mt-4 text-gray-700 text-base sm:text-lg leading-relaxed">
              A modern learning platform built for tax professionals —
              structured lessons, SOPs, quizzes, and client workflow training,
              all branded to your firm. Help new preparers get IRS-ready fast
              and keep your experienced pros sharp.
            </p>

            <div className="mt-6 flex flex-wrap gap-4 items-center">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#bb4823] to-blue-800 shadow-md hover:shadow-lg transition-shadow"
              >
                Join the Waitlist
              </a>
              <button
                type="button"
                className="inline-flex items-center text-sm font-semibold text-blue-800 hover:text-[#bb4823] transition-colors"
              >
                <FaPlayCircle className="mr-2" />
                See example curriculum (coming soon)
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Built for solo pros, multi-preparer offices, and virtual tax
              teams.
            </p>
          </div>

          {/* Right "card" */}
          <div className="flex-1 w-full">
            <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-lg border border-blue-100 px-6 py-6 sm:px-8 sm:py-8">
              <p className="text-xs font-semibold text-[#bb4823] uppercase tracking-wide mb-2">
                What&apos;s inside the LMS
              </p>
              <h2 className="text-xl font-bold text-blue-900 mb-4">
                Tax Training that Feels Like a Real System,
                <span className="text-[#bb4823]"> Not Random PDFs.</span>
              </h2>

              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <FaCheckCircle className="mt-1 shrink-0 text-[#bb4823]" />
                  <span>
                    Step-by-step modules for{" "}
                    <strong>1040 individual returns, EITC, CTC, HOH,</strong>{" "}
                    and more.
                  </span>
                </li>
                <li className="flex gap-3">
                  <FaCheckCircle className="mt-1 shrink-0 text-[#bb4823]" />
                  <span>
                    Built-in quizzes &amp; completion tracking so you know
                    who&apos;s actually learning — not just &quot;clicking
                    next&quot;.
                  </span>
                </li>
                <li className="flex gap-3">
                  <FaCheckCircle className="mt-1 shrink-0 text-[#bb4823]" />
                  <span>
                    Upload your own <strong>SOPs, scripts, and office
                    policies</strong> so everything lives in one clean hub.
                  </span>
                </li>
                <li className="flex gap-3">
                  <FaCheckCircle className="mt-1 shrink-0 text-[#bb4823]" />
                  <span>
                    Role-based access for preparers, office managers, and QA
                    reviewers.
                  </span>
                </li>
              </ul>

              <p className="mt-4 text-xs text-gray-500">
                Designed with an IRS-clean, professional interface — no clutter,
                no distractions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white/90 border-y border-blue-100/60">
        <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <h2 className="text-2xl font-bold text-blue-900">
              Built Specifically for Tax Offices
            </h2>
            <p className="text-sm text-gray-600 max-w-xl">
              Not a generic course platform. Every part of this LMS is shaped
              around tax-season realities: deadlines, accuracy, compliance, and
              onboarding new staff quickly without babysitting.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
              <div className="flex items-center gap-3 mb-3">
                <FaUserTie className="text-[#bb4823]" />
                <h3 className="font-semibold text-blue-900">
                  Tax Pro-Focused Curriculum
                </h3>
              </div>
              <p className="text-sm text-gray-700">
                Modules on IRS due diligence, client intake, organizers,
                workflow, and common red flags — plus space to plug in your
                firm&apos;s unique process.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
              <div className="flex items-center gap-3 mb-3">
                <FaLock className="text-[#bb4823]" />
                <h3 className="font-semibold text-blue-900">
                  Compliance & Consistency
                </h3>
              </div>
              <p className="text-sm text-gray-700">
                Use the LMS to standardize how your team handles sensitive
                documents, identity verification, and IRS notices — and keep
                everyone on the same page.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
              <div className="flex items-center gap-3 mb-3">
                <FaCheckCircle className="text-[#bb4823]" />
                <h3 className="font-semibold text-blue-900">
                  Ready for New &amp; Returning Staff
                </h3>
              </div>
              <p className="text-sm text-gray-700">
                Turn &quot;Can you train me?&quot; into
                &quot;Here&apos;s your login.&quot; Track who is ready for live
                returns and who needs more practice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Modules Section */}
      <section className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-blue-900">
            Example Tracks Inside the LMS
          </h2>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">
            You&apos;ll be able to mix our pre-built tracks with your own
            content, videos, and PDFs — all organized into clean, guided
            learning paths.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#bb4823] uppercase mb-1">
              Track 1
            </p>
            <h3 className="font-semibold text-blue-900 mb-2">
              New Preparer Foundation
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Tax office etiquette & communication</li>
              <li>• Understanding tax documents (W-2, 1099, 1098, etc.)</li>
              <li>• Basic 1040 structure & common credits</li>
              <li>• Using your chosen tax software</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#bb4823] uppercase mb-1">
              Track 2
            </p>
            <h3 className="font-semibold text-blue-900 mb-2">
              Due Diligence & Compliance
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• EITC, CTC, ACTC due diligence checklists</li>
              <li>• Identity theft red flags</li>
              <li>• Secure document handling</li>
              <li>• Handling IRS letters the right way</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#bb4823] uppercase mb-1">
              Track 3
            </p>
            <h3 className="font-semibold text-blue-900 mb-2">
              Client Experience & Upsells
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Intake scripts & expectation setting</li>
              <li>• Explaining refunds & balances clearly</li>
              <li>• Offering add-on services ethically</li>
              <li>• Retention strategies after tax season</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white/90 border-t border-blue-100/60">
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
          <div className="mb-6 sm:mb-8 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-blue-900">
              FAQ – LMS for Tax Pros
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              A few common questions from EROs, office owners, and tax pros
              looking to train their team.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <FaqItem
              question="Who is this LMS for?"
              answer="The LMS is designed for tax firm owners, EROs, and preparers who want a structured way to train new staff, standardize their processes, and keep everyone up to date on IRS expectations. Solo pros can use it to document their own systems as they grow."
            />
            <FaqItem
              question="Can I add my own videos, PDFs, and SOPs?"
              answer="Yes. Our goal is to give you a ready-made tax foundation plus a clean place to plug in your own SOPs, office policies, scripts, and client workflow. You’ll be able to organize everything into tracks that match your firm."
            />
            <FaqItem
              question="Will the LMS be branded to my firm?"
              answer="We’re building the LMS so your staff sees your firm name and your process front and center. SW Tax Service powers the backend, but the experience is meant to feel like your firm’s private training hub."
            />
            <FaqItem
              question="Is this a tax software or just training?"
              answer="This is a training and learning management system, not tax prep software. You’ll still use your own tax software, but the LMS teaches your team how to work, think, and follow your process around that software."
            />
            <FaqItem
              question="When will early access open and how much will it cost?"
              answer="We’re finalizing the first modules and early-access pricing now. Joining the waitlist gets you first notice, early-bird pricing, and the chance to request specific modules you want us to prioritize for your firm."
            />
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section
        id="waitlist"
        className="bg-blue-900 text-white py-12 sm:py-16"
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-2 items-start">
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase text-blue-200 mb-2">
                Join the early access waitlist
              </p>
              <h2 className="text-2xl font-bold mb-3">
                Be the First to Launch the LMS in Your Tax Office
              </h2>
              <p className="text-sm text-blue-100 mb-4">
                Get notified when the LMS is ready, plus early-bird pricing and
                the chance to help shape the first modules and templates.
              </p>

              <ul className="space-y-2 text-sm text-blue-100">
                <li>• Designed for solo pros and multi-preparer teams</li>
                <li>• IRS-clean interface — no clutter, no confusion</li>
                <li>• Plug in your own SOPs and intake process</li>
              </ul>
            </div>

            <div className="bg-white text-blue-900 rounded-2xl p-5 shadow-lg">
              {submitted ? (
                <div className="text-center py-6">
                  <h3 className="text-lg font-semibold mb-2">
                    You&apos;re on the list 🎉
                  </h3>
                  <p className="text-sm text-gray-700">
                    We&apos;ll email you as soon as the LMS for Tax Pros is
                    ready for early access and send updates as we build.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-xs font-semibold mb-1"
                    >
                      Your Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="First & Last Name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="you@taxfirm.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="firm"
                      className="block text-xs font-semibold mb-1"
                    >
                      Firm / Business Name
                    </label>
                    <input
                      id="firm"
                      name="firm"
                      type="text"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="SW Tax Service"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="teamSize"
                        className="block text-xs font-semibold mb-1"
                      >
                        Team Size
                      </label>
                      <select
                        id="teamSize"
                        name="teamSize"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="solo">Solo preparer</option>
                        <option value="2-4">2–4 preparers</option>
                        <option value="5-10">5–10 preparers</option>
                        <option value="10+">10+ preparers</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="experience"
                        className="block text-xs font-semibold mb-1"
                      >
                        Years of Experience
                      </label>
                      <select
                        id="experience"
                        name="experience"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="0-1">0–1 years</option>
                        <option value="2-5">2–5 years</option>
                        <option value="6-10">6–10 years</option>
                        <option value="10+">10+ years</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      id="ero"
                      name="ero"
                      type="checkbox"
                      className="mt-1"
                    />
                    <label
                      htmlFor="ero"
                      className="text-xs text-gray-700"
                    >
                      I am an ERO / office owner and want to use the LMS to
                      train my team.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center items-center rounded-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#bb4823] to-blue-800 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? "Joining waitlist..." : "Join the Waitlist"}
                  </button>

                  <p className="text-[11px] text-gray-500 mt-1">
                    No spam. We&apos;ll only contact you with LMS updates and
                    launch info for SW Tax Service products.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer mini */}
      <section className="py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} SW Tax Service. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-blue-700">
              Back to Home
            </Link>
            <Link href="/site/services" className="hover:text-blue-700">
              Services
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
