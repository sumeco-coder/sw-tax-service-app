// app/(client)/(protected)/(onboarding)/onboarding/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

configureAmplify();

type StepCode = "PROFILE" | "DOCUMENTS" | "QUESTIONS" | "SCHEDULE" | "SUMMARY" | "AGREEMENTS";
type DbStep = StepCode | "SUBMITTED" | "DONE" | null;

type Me = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  onboardingStep: DbStep;
};

const STEPS: Array<{
  id: number;
  code: StepCode;
  title: string;
  description: string;
  href: string;
}> = [
  {
    id: 1,
    code: "PROFILE",
    title: "Confirm your details",
    description:
      "Review your contact info and basic profile so we know how to reach you.",
    href: "/onboarding/profile",
  },
  {
    id: 2,
    code: "DOCUMENTS",
    title: "Upload your tax documents",
    description:
      "W-2s, 1099s, ID, prior-year returns and anything else that applies.",
    href: "/onboarding/documents",
  },
  {
    id: 3,
    code: "QUESTIONS",
    title: "Answer a few questions",
    description:
      "Tell us about your income, dependents, and deductions so we can maximize your refund.",
    href: "/onboarding/questions",
  },
  {
    id: 4,
    code: "SCHEDULE",
    title: "Schedule your review call",
    description:
      "Pick a time for your tax pro to review everything with you before filing.",
    href: "/onboarding/schedule",
  },
  {
    id: 5,
    code: "SUMMARY",
    title: "Summary & review",
    description:
      "Review what you submitted and confirm everything looks correct.",
    href: "/onboarding/summary",
  },
  {
    id: 6,
    code: "AGREEMENTS",
    title: "Review & sign agreements",
    description:
      "Sign your engagement letter + payment consent (spouse signs too if filing jointly).",
    href: "/onboarding/agreements",
  },
];

function normalizeEffectiveStep(step: DbStep): StepCode {
  if (step === "SUBMITTED" || step === "DONE") return "SUMMARY";
  return (step as StepCode) ?? "PROFILE";
}

async function ensureServerSession() {
  const session = await fetchAuthSession();

  // ✅ IMPORTANT: send JWT strings, not token objects
  const idToken = session.tokens?.idToken?.toString();
  const accessToken = session.tokens?.accessToken?.toString();

  if (!idToken || !accessToken) return null;

  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken, accessToken }),
  });

  if (!res.ok) return null;

  return session; // return for reuse below
}

export default function OnboardingPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
          const session = (await ensureServerSession()) ?? (await fetchAuthSession());

        const tokenEmail =
          (session.tokens?.idToken?.payload["email"] as string | undefined) ?? "";

        const email =
          tokenEmail || (u.signInDetails?.loginId as string | undefined) || "";

        const res = await fetch("/api/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cognitoSub: u.userId,
            email,
          }),
        });

        if (!res.ok) {
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
          onboardingStep: (dbUser?.onboardingStep as DbStep) ?? null,
        });
      } catch (err) {
        console.error("Failed to load onboarding user:", err);
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayName = useMemo(() => {
    const first = me?.firstName?.trim();
    if (first) return first;
    const name = me?.name?.trim();
    if (name) return name.split(" ")[0];
    const email = me?.email?.trim();
    if (email) return email.split("@")[0];
    return "there";
  }, [me]);

  const dbStep: DbStep = me?.onboardingStep ?? null;
  const isSubmitted = dbStep === "SUBMITTED" || dbStep === "DONE";
  const effectiveStep: StepCode = normalizeEffectiveStep(dbStep);

  const currentStepObj =
    STEPS.find((s) => s.code === effectiveStep) ?? STEPS[0];

  const currentIndex = isSubmitted ? STEPS.length : currentStepObj.id;

  const stepsWithStatus = STEPS.map((s) => {
    let status: "done" | "current" | "upcoming" = "upcoming";

    if (isSubmitted) status = "done";
    else if (s.id < currentIndex) status = "done";
    else if (s.id === currentIndex) status = "current";

    return { ...s, status };
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-8 w-72 rounded bg-muted" />
          <div className="h-24 rounded-2xl bg-muted" />
        </div>
      </main>
    );
  }

  const statusText = isSubmitted ? "Submitted" : "In progress";

   const nextAction =
    !isSubmitted && effectiveStep === "SUMMARY"
      ? STEPS.find((s) => s.code === "AGREEMENTS")!
      : currentStepObj;


  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Taxpayer onboarding
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {displayName} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              We’ll walk you through a few quick steps so your tax pro has
              everything needed to prepare and file accurately.
            </p>
          </div>

          <div className="rounded-2xl bg-card px-4 py-3 text-right shadow-sm ring-1 ring-border">
            <p className="text-xs font-medium text-muted-foreground">
              Onboarding status
            </p>
            <p
              className={[
                "text-sm font-semibold",
                isSubmitted ? "text-primary" : "text-foreground",
              ].join(" ")}
            >
              {statusText}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              You can come back anytime.
            </p>
          </div>
        </header>

        {/* Progress overview */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Step
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {currentIndex} / {STEPS.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isSubmitted ? "All steps completed" : currentStepObj.title}
            </p>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Estimated time
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">10–15 min</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Save and come back later if needed.
            </p>
          </div>

          <div className="rounded-2xl bg-primary p-4 shadow-sm text-primary-foreground">
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-90">
              Next action
            </p>
            <p className="mt-1 text-sm font-semibold">
               {isSubmitted ? "View your summary" : nextAction.title}
            </p>
            <Link
              href={isSubmitted ? "/onboarding/summary" : nextAction.href}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-primary-foreground/10 px-3 py-2 text-xs font-semibold hover:bg-primary-foreground/15"
            >
              {isSubmitted ? "Open summary" : "Continue where you left off"}
            </Link>
          </div>
        </section>

        {/* Step list */}
        <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h2 className="text-sm font-semibold text-foreground">
            Your onboarding steps
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete in order for the fastest review, but you can revisit any
            completed step anytime.
          </p>

          <ol className="mt-4 space-y-3">
            {stepsWithStatus.map((step) => {
              const agreementsUnlock =
                step.code === "AGREEMENTS" && effectiveStep === "SUMMARY" && !isSubmitted;

              const locked =
                !isSubmitted &&
                step.status === "upcoming" &&
                !agreementsUnlock;


              return (
                <li
                  key={step.code}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-3"
                >
                  {/* Step bullet */}
                  <div
                    className={[
                      "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                      step.status === "done"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : step.status === "current"
                        ? "border-primary/30 bg-card text-primary"
                        : "border-border bg-card text-muted-foreground",
                    ].join(" ")}
                  >
                    {step.id}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>

                      {/* Status pill */}
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
                          isSubmitted
                            ? "bg-primary/10 text-primary ring-primary/20"
                            : step.status === "current"
                            ? "bg-primary/10 text-primary ring-primary/20"
                            : step.status === "done"
                            ? "bg-muted text-foreground ring-border"
                            : "bg-muted text-muted-foreground ring-border",
                        ].join(" ")}
                      >
                        {isSubmitted
                          ? "Completed"
                          : step.status === "current" || agreementsUnlock
                          ? "Next up"
                          : step.status === "done"
                          ? "Completed"
                          : "Locked"}
                      </span>
                    </div>

                    {/* Button */}
                    <div className="mt-2">
                      {locked ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground cursor-not-allowed"
                        >
                          Complete earlier steps first
                        </button>
                      ) : (
                        <Link
                          href={step.href}
                          className="inline-flex items-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        >
                           {step.status === "done" || isSubmitted
                            ? "Review"
                            : step.code === "AGREEMENTS" && agreementsUnlock
                            ? "Continue"
                            : "Start"}
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Need help? Contact support and we’ll walk you through the steps.
        </p>
      </div>
    </main>
  );
}
