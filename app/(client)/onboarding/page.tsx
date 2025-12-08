// app/(client)/onboarding/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

configureAmplify();

type OnboardingStepCode = "PROFILE" | "DOCUMENTS" | "QUESTIONS" | "SCHEDULE";

type Me = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  onboardingStep: OnboardingStepCode | null;
};

const BASE_STEPS = [
  {
    id: 1,
    code: "PROFILE" as OnboardingStepCode,
    title: "Confirm your details",
    description:
      "Review your contact info and basic profile so we know how to reach you.",
    href: "/onboarding/profile",
  },
  {
    id: 2,
    code: "DOCUMENTS" as OnboardingStepCode,
    title: "Upload your tax documents",
    description:
      "W-2s, 1099s, ID, prior-year returns and anything else that applies.",
    href: "/onboarding/documents",
  },
  {
    id: 3,
    code: "QUESTIONS" as OnboardingStepCode,
    title: "Answer a few questions",
    description:
      "Tell us about your income, dependents, and deductions so we can maximize your refund.",
    href: "/onboarding/questions",
  },
  {
    id: 4,
    code: "SCHEDULE" as OnboardingStepCode,
    title: "Schedule your review call",
    description:
      "Pick a time for your tax pro to review everything with you before filing.",
    href: "/onboarding/schedule",
  },
  {
    id: 4,
    code: "SUMMARY" as OnboardingStepCode,
    title: "Summary & review",
    description:
      "Pick a time for your tax pro to review everything with you before filing.",
    href: "/onboarding/summary",
  },
];

export default function OnboardingPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        const session = await fetchAuthSession();

        const tokenEmail =
          (session.tokens?.idToken?.payload["email"] as string | undefined) ??
          "";

        const email =
          tokenEmail || (u.signInDetails?.loginId as string | undefined) || "";

        console.log("ONBOARDING / CURRENT USER:", u);
        console.log("ONBOARDING / TOKEN EMAIL:", tokenEmail);
        console.log("ONBOARDING / FINAL EMAIL:", email);

        const res = await fetch("/api/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cognitoSub: u.userId,
            email,
          }),
        });

        if (!res.ok) {
          console.error("Failed to fetch /api/me", await res.text());
          setMe({
            email,
            firstName: null,
            lastName: null,
            name: null,
            onboardingStep: null,
          });
          return;
        }

        const data = await res.json();
        const dbUser = data.user;

        setMe({
          email,
          firstName: dbUser?.firstName ?? null,
          lastName: dbUser?.lastName ?? null,
          name: dbUser?.name ?? null,
          onboardingStep: (dbUser?.onboardingStep as OnboardingStepCode | null) ?? null,
        });
      } catch (err) {
        console.error("Failed to load onboarding user:", err);
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayName =
    me?.firstName ||
    me?.name ||
    (me?.email ? me.email.split("@")[0] : "there");

  // Decide which step is “current” based on DB
  const currentStepCode: OnboardingStepCode =
    me?.onboardingStep ?? "PROFILE";

  const currentStepObj =
    BASE_STEPS.find((s) => s.code === currentStepCode) ?? BASE_STEPS[0];

  const currentIndex = currentStepObj.id;

  const stepsWithStatus = BASE_STEPS.map((step) => {
    let status: "done" | "current" | "upcoming" = "upcoming";
    if (step.id < currentIndex) status = "done";
    else if (step.id === currentIndex) status = "current";
    return { ...step, status };
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-8 w-72 rounded bg-slate-200" />
          <div className="h-24 rounded-xl bg-slate-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Taxpayer onboarding
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back{displayName ? `, ${displayName}` : ""} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              We’ll walk you through a few quick steps so your tax pro has
              everything they need to prepare and file your return accurately.
            </p>
          </div>

          <div className="rounded-xl bg-white/80 px-4 py-3 text-right shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">
              Onboarding status
            </p>
            <p className="text-sm font-semibold text-emerald-700">
              {currentIndex === BASE_STEPS.length
                ? "Almost finished"
                : "In progress"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              You can come back and finish anytime.
            </p>
          </div>
        </header>

        {/* Progress overview */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Step
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {currentIndex} / {BASE_STEPS.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {currentStepObj.title}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Estimated time
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              10–15 min
            </p>
            <p className="mt-1 text-xs text-slate-500">
              You can save and come back later if needed.
            </p>
          </div>
          <div className="rounded-xl bg-blue-600 p-4 shadow-sm text-white">
            <p className="text-[11px] font-medium uppercase tracking-wide text-blue-100">
              Next action
            </p>
            <p className="mt-1 text-sm font-semibold">
              {currentStepObj.title}
            </p>
            <Link
              href={currentStepObj.href}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
            >
              Continue where you left off
            </Link>
          </div>
        </section>

        {/* Step list */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Your onboarding steps
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            We recommend completing these in order, but you can come back to any
            step if you need to update something.
          </p>

          <ol className="mt-4 space-y-3">
            {stepsWithStatus.map((step) => (
              <li
                key={step.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3"
              >
                {/* Step bullet */}
                <div
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold
                  ${
                    step.status === "done"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : step.status === "current"
                      ? "border-blue-200 bg-white text-blue-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {step.id}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {step.description}
                      </p>
                    </div>

                    {/* Status pill */}
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        step.status === "current"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : step.status === "done"
                          ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          : "bg-slate-50 text-slate-500 ring-1 ring-slate-200"
                      }`}
                    >
                      {step.status === "current"
                        ? "Next up"
                        : step.status === "done"
                        ? "Completed"
                        : "Coming soon"}
                    </span>
                  </div>

                  {/* Button */}
                  <div className="mt-2">
                    {step.status === "upcoming" ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
                      >
                        Locked until earlier steps are done
                      </button>
                    ) : (
                      <Link
                        href={step.href}
                        className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                      >
                        {step.status === "done"
                          ? "Review this step"
                          : "Start this step"}
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Footer note */}
        <p className="mt-4 text-center text-[11px] text-slate-500">
          Need help during onboarding? Reply to any email from SW Tax Service or
          contact support and we&apos;ll walk you through the steps.
        </p>
      </div>
    </main>
  );
}
