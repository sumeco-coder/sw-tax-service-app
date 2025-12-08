// app/(client)/onboarding/summary/page.tsx
import Link from "next/link";
import AppointmentSummary from "../_components/AppointmentSummary";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type SectionStatus = "complete" | "incomplete" | "in_progress";

type SectionConfig = {
  id: string;
  title: string;
  description: string;
  href: string;
  stepKey: "PROFILE" | "DOCUMENTS" | "QUESTIONS" | "SCHEDULE";
};

type Section = SectionConfig & {
  status: SectionStatus;
};

const sectionConfigs: SectionConfig[] = [
  {
    id: "profile",
    title: "Confirm your details",
    description: "Your legal name, contact info, and basic profile.",
    href: "/onboarding/profile",
    stepKey: "PROFILE",
  },
  {
    id: "documents",
    title: "Tax documents",
    description: "W-2s, 1099s, ID, and prior-year tax returns.",
    href: "/onboarding/documents",
    stepKey: "DOCUMENTS",
  },
  {
    id: "questions",
    title: "Tax questions",
    description: "Income, dependents, deductions, and credits.",
    href: "/onboarding/questions",
    stepKey: "QUESTIONS",
  },
  {
    id: "schedule",
    title: "Review call",
    description: "Your appointment with a tax pro before filing.",
    href: "/onboarding/schedule",
    stepKey: "SCHEDULE",
  },
];

// Order of steps in your enum
const STEP_ORDER = [
  "PROFILE",
  "DOCUMENTS",
  "QUESTIONS",
  "SCHEDULE",
  "SUMMARY",
  "SUBMITTED",
  "DONE",
] as const;
type OnboardingStep = (typeof STEP_ORDER)[number] | null;

function getStepIndex(step: OnboardingStep) {
  if (!step) return 0;
  const idx = STEP_ORDER.indexOf(step as any);
  return idx === -1 ? 0 : idx;
}

function statusLabel(status: SectionStatus) {
  switch (status) {
    case "complete":
      return "Complete";
    case "in_progress":
      return "In progress";
    case "incomplete":
      return "Not started";
    default:
      return "";
  }
}

function statusClasses(status: SectionStatus) {
  switch (status) {
    case "complete":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "in_progress":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "incomplete":
    default:
      return "bg-slate-50 text-slate-500 ring-1 ring-slate-200";
  }
}

/**
 * Server action: mark onboarding as SUBMITTED for the current user.
 */
async function submitOnboarding(_formData: FormData) {
  "use server";

  try {
    const cookieStore = await cookies();

    // If you store token in "accessToken" instead, change this:
    const idToken = cookieStore.get("idToken")?.value;
    // const idToken = cookieStore.get("accessToken")?.value;

    if (!idToken) {
      console.error("submitOnboarding: no idToken cookie found");
      return;
    }

    const decoded: any = decodeJwt(idToken);
    const sub = decoded?.sub as string | undefined;

    if (!sub) {
      console.error("submitOnboarding: no sub in JWT");
      return;
    }

    // Find user
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.cognitoSub, sub))
      .limit(1);

    if (!userRow) {
      console.error("submitOnboarding: user not found for sub", sub);
      return;
    }

    const now = new Date();

    // Your onboardingStep enum: PROFILE, DOCUMENTS, QUESTIONS, SCHEDULE, SUMMARY, SUBMITTED, DONE
    await db
      .update(users)
      .set({
        onboardingStep: "SUBMITTED",
        updatedAt: now,
      })
      .where(eq(users.id, userRow.id));

    revalidatePath("/onboarding");
    revalidatePath("/onboarding/summary");
  } catch (err) {
    console.error("submitOnboarding error:", err);
  }
}

export default async function OnboardingSummaryPage() {
  // 1) Figure out current onboardingStep from DB using Cognito sub
  const cookieStore = await cookies();
  const idToken = cookieStore.get("idToken")?.value;

  let onboardingStep: OnboardingStep = null;

  if (idToken) {
    try {
      const decoded: any = decodeJwt(idToken);
      const sub = decoded?.sub as string | undefined;

      if (sub) {
        const [userRow] = await db
          .select({
            onboardingStep: users.onboardingStep,
          })
          .from(users)
          .where(eq(users.cognitoSub, sub))
          .limit(1);

        onboardingStep = (userRow?.onboardingStep as OnboardingStep) ?? null;
      }
    } catch (err) {
      console.error(
        "OnboardingSummaryPage: error decoding token or fetching user",
        err
      );
    }
  }

  // 2) Build sections with real status based on onboardingStep
  const currentIndex = getStepIndex(onboardingStep);

  const sections: Section[] = sectionConfigs.map((cfg) => {
    const sectionIndex = STEP_ORDER.indexOf(cfg.stepKey as any);

    let status: SectionStatus = "incomplete";

    if (currentIndex > sectionIndex) {
      status = "complete";
    } else if (currentIndex === sectionIndex) {
      // They're actively on /just finished this step
      status = onboardingStep === "SUBMITTED" || onboardingStep === "DONE"
        ? "complete"
        : "in_progress";
    } else {
      status = "incomplete";
    }

    // If we've reached SUMMARY / SUBMITTED / DONE, treat all as complete
    if (
      onboardingStep === "SUMMARY" ||
      onboardingStep === "SUBMITTED" ||
      onboardingStep === "DONE"
    ) {
      status = "complete";
    }

    return { ...cfg, status };
  });

  const allComplete = sections.every((s) => s.status === "complete");
  const isSubmitted =
    onboardingStep === "SUBMITTED" || onboardingStep === "DONE";

  // Derived UI strings
  let statusText = "Needs review";
  let statusColor = "text-amber-700";
  let statusSubText =
    "You can update any section below before you submit.";

  if (isSubmitted) {
    statusText = "Submitted";
    statusColor = "text-emerald-700";
    statusSubText =
      "We’ve received your onboarding. Your tax professional will review your information and follow up if anything else is needed.";
  } else if (allComplete) {
    statusText = "Ready to submit";
    statusColor = "text-emerald-700";
    statusSubText =
      "Everything looks good. You can submit your onboarding when you’re ready.";
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Taxpayer onboarding – summary
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Review & submit your information
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Take a quick look over everything before we assign your case to a
              tax professional. You can still edit anything that doesn&apos;t
              look right.
            </p>
          </div>

          <div className="rounded-xl bg-white/80 px-4 py-3 text-right shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">
              Onboarding status
            </p>
            <p className={`text-sm font-semibold ${statusColor}`}>
              {statusText}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">{statusSubText}</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          {/* Left: checklist */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Your onboarding checklist
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Make sure each section is complete so your tax pro has everything
              they need to work on your return.
            </p>

            <ol className="mt-4 space-y-3">
              {sections.map((section) => (
                <li
                  key={section.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3"
                >
                  {/* Status icon */}
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                    {section.status === "complete" ? (
                      <span className="text-[13px] font-semibold text-emerald-600">
                        ✓
                      </span>
                    ) : section.status === "in_progress" ? (
                      <span className="text-[13px] font-semibold text-amber-500">
                        …
                      </span>
                    ) : (
                      <span className="text-[13px] font-semibold text-slate-400">
                        –
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {section.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {section.description}
                        </p>
                      </div>

                      <span
                        className={
                          "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold " +
                          statusClasses(section.status)
                        }
                      >
                        {statusLabel(section.status)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={section.href}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {section.status === "complete" ? "Review" : "Finish"}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Right: appointment + submit */}
          <section className="space-y-4">
            {/* Appointment card */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                Your review call
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                This is when your tax pro will walk through your information
                with you before filing.
              </p>

              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
                <AppointmentSummary />
              </div>

              <div className="mt-3 flex justify-end">
                <Link
                  href="/onboarding/schedule"
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                >
                  Change appointment
                </Link>
              </div>
            </div>

            {/* Final submit card */}
            <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-sm">
              <h2 className="text-sm font-semibold">
                {isSubmitted ? "Onboarding submitted" : "Ready to submit?"}
              </h2>
              <p className="mt-1 text-xs text-blue-100">
                {isSubmitted
                  ? "We’ve received your onboarding details. Your tax pro will review everything and reach out if anything else is needed. You can still upload extra documents later from your dashboard."
                  : "When you’re done reviewing, submit your onboarding so our team can start working on your return. You’ll still be able to upload additional documents later if needed."}
              </p>

              <div className="mt-4 space-y-2">
                <form action={submitOnboarding}>
                  <button
                    type="submit"
                    disabled={isSubmitted}
                    className={
                      "inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold " +
                      (isSubmitted
                        ? "bg:white/10 cursor-not-allowed opacity-70 text-blue-100"
                        : "bg-white/10 hover:bg-white/20")
                    }
                  >
                    {isSubmitted
                      ? "Onboarding already submitted"
                      : "Submit onboarding for review"}
                  </button>
                </form>

                <p className="text-[11px] text-blue-100 text-center">
                  By submitting, you confirm that the information you&apos;ve
                  provided is accurate to the best of your knowledge.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-center text-slate-500">
          Need to fix something later? No problem — you can always log back in,
          upload more documents, or message your tax pro from your dashboard.
        </p>
      </div>
    </main>
  );
}
