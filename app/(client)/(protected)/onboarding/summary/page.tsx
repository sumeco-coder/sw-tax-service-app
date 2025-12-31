// app/(client)/onboarding/summary/page.tsx
import Link from "next/link";
import AppointmentSummary from "../_components/AppointmentSummary";
import { db } from "@/drizzle/db";
import { users, appointments } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = {
  primary: "#E00040",
  accent: "#B04020",
  dark: "#202030",
};

type SectionStatus = "complete" | "incomplete" | "in_progress" | "optional";

type SectionConfig = {
  id: string;
  title: string;
  description: string;
  href: string;
  stepKey: "PROFILE" | "DOCUMENTS" | "QUESTIONS" | "SCHEDULE";
  optional?: boolean;
};

type Section = SectionConfig & {
  status: SectionStatus;
};

const sectionConfigs: SectionConfig[] = [
  {
    id: "profile",
    title: "Confirm your details",
    description: "Legal name, contact info, and basic profile.",
    href: "/onboarding/profile",
    stepKey: "PROFILE",
  },
  {
    id: "documents",
    title: "Tax documents",
    description: "W-2s, 1099s, ID, and prior-year returns.",
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
    title: "Review call (optional)",
    description: "Book a time with a tax pro (you can skip for now).",
    href: "/onboarding/schedule",
    stepKey: "SCHEDULE",
    optional: true,
  },
];

const STEP_ORDER = [
  "PROFILE",
  "DOCUMENTS",
  "QUESTIONS",
  "SCHEDULE",
  "SUMMARY",
  "AGREEMENTS",
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
    case "optional":
      return "Optional";
    case "incomplete":
    default:
      return "Not started";
  }
}

function statusPillClasses(status: SectionStatus) {
  switch (status) {
    case "complete":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "in_progress":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "optional":
      return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
    case "incomplete":
    default:
      return "bg-slate-50 text-slate-500 ring-1 ring-slate-200";
  }
}

function iconFor(status: SectionStatus) {
  if (status === "complete") return "✓";
  if (status === "in_progress") return "…";
  if (status === "optional") return "•";
  return "–";
}

/**
 * Server action: move user from SUMMARY → AGREEMENTS
 * ✅ does NOT submit onboarding yet
 */
async function continueToAgreements(_formData: FormData) {
  "use server";

  const auth = await getServerRole();
  if (!auth) return redirect("/sign-in"); // ✅ return

  const sub = String(auth.sub ?? "");
  if (!sub) return redirect("/sign-in"); // ✅ return

  const [row] = await db
    .select({ id: users.id, onboardingStep: users.onboardingStep })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!row) redirect("/onboarding");

  const current = (row.onboardingStep as unknown as OnboardingStep) ?? null;

  // If already submitted/done, go dashboard
  if (current === "SUBMITTED" || current === "DONE") {
    const next =
      auth.role === "ADMIN"
        ? "/admin"
        : auth.role === "LMS_ADMIN"
        ? "/lms"
        : auth.role === "LMS_PREPARER"
        ? "/preparer"
        : "/profile";
    redirect(next);
  }

  // Must be at/after SUMMARY to enter Agreements
  if (getStepIndex(current) < getStepIndex("SUMMARY")) {
    redirect("/onboarding");
  }

  // If already on agreements, just go there
  if (current === "AGREEMENTS") {
    redirect("/onboarding/agreements");
  }

  await db
    .update(users)
    .set({
      onboardingStep: "AGREEMENTS" as any,
      updatedAt: new Date(),
    })
    .where(eq(users.id, row.id));

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/summary");
  revalidatePath("/onboarding/agreements");

  redirect("/onboarding/agreements");
}

export default async function OnboardingSummaryPage() {
  const auth = await getServerRole();
  if (!auth) return redirect("/sign-in"); 

  const sub = String(auth.sub ?? "");
  if (!sub) return redirect("/sign-in"); 

  const dashboardHref =
    auth.role === "ADMIN"
      ? "/admin"
      : auth.role === "LMS_ADMIN"
      ? "/lms"
      : auth.role === "LMS_PREPARER"
      ? "/preparer"
      : "/profile";

  const [userRow] = await db
    .select({
      id: users.id,
      onboardingStep: users.onboardingStep,
    })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!userRow) redirect("/onboarding");

  let onboardingStep: OnboardingStep =
    (userRow.onboardingStep as unknown as OnboardingStep) ?? null;

  // If already submitted/done, keep them moving (optional — comment out if you want them to still view summary)
  // if (onboardingStep === "SUBMITTED" || onboardingStep === "DONE") {
  //   redirect(dashboardHref);
  // }

  // ✅ If they land here after QUESTIONS or SCHEDULE, mark SUMMARY (keeps UI/DB aligned)
  if (onboardingStep === "QUESTIONS" || onboardingStep === "SCHEDULE") {
    await db
      .update(users)
      .set({ onboardingStep: "SUMMARY" as any, updatedAt: new Date() })
      .where(eq(users.id, userRow.id));
    onboardingStep = "SUMMARY";
    revalidatePath("/onboarding");
    revalidatePath("/onboarding/summary");
  }

  // ✅ Check appointment (Schedule section complete only if appointment exists)
  const [appt] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      scheduledAt: appointments.scheduledAt,
    })
    .from(appointments)
    .where(eq(appointments.userId, userRow.id))
    .orderBy(desc(appointments.scheduledAt))
    .limit(1);

  const hasScheduledAppointment = !!appt && appt.status === "scheduled";
  const currentIndex = getStepIndex(onboardingStep);

  const sections: Section[] = sectionConfigs.map((cfg) => {
    const sectionIndex = STEP_ORDER.indexOf(cfg.stepKey as any);
    let status: SectionStatus = "incomplete";

    // Schedule is optional, only complete if appointment exists
    if (cfg.stepKey === "SCHEDULE") {
      if (hasScheduledAppointment) status = "complete";
      else status = cfg.optional ? "optional" : "incomplete";
      return { ...cfg, status };
    }

    if (currentIndex > sectionIndex) status = "complete";
    else if (currentIndex === sectionIndex) status = "in_progress";
    else status = "incomplete";

    if (onboardingStep === "SUBMITTED" || onboardingStep === "DONE") status = "complete";

    return { ...cfg, status };
  });

  const requiredSections = sections.filter((s) => !s.optional);
  const requiredComplete = requiredSections.filter((s) => s.status === "complete").length;
  const requiredTotal = requiredSections.length;
  const progressPct = Math.round((requiredComplete / Math.max(1, requiredTotal)) * 100);

  const isSubmitted = onboardingStep === "SUBMITTED" || onboardingStep === "DONE";

  // Ready means ready to proceed to agreements (not submit)
  const readyToContinue = requiredSections.every((s) => s.status === "complete") && !isSubmitted;

  const alreadyInAgreements = onboardingStep === "AGREEMENTS";

  const statusText = isSubmitted
    ? "Submitted"
    : alreadyInAgreements
    ? "Signing"
    : readyToContinue
    ? "Ready to sign"
    : "Needs review";

  const statusTone = isSubmitted
    ? "text-emerald-200"
    : alreadyInAgreements || readyToContinue
    ? "text-emerald-200"
    : "text-amber-200";

  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{
        background: `radial-gradient(1200px 600px at 20% 0%, ${BRAND.primary}22, transparent 60%),
                     radial-gradient(900px 500px at 80% 10%, ${BRAND.accent}22, transparent 55%),
                     linear-gradient(180deg, ${BRAND.dark} 0%, #0b0b14 40%, #f8fafc 100%)`,
      }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: BRAND.primary }}>
              Taxpayer onboarding
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Review & continue
              <span className="ml-2 inline-block rounded-full px-3 py-1 text-xs font-semibold align-middle ring-1 ring-white/15 bg-white/10">
                {progressPct}% complete
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Check your details, documents, and answers. Scheduling a call is optional. Next you’ll sign your agreements.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 text-right text-white ring-1 ring-white/15 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Status</p>
            <p className={`mt-1 text-sm font-bold ${statusTone}`}>{statusText}</p>

            <div className="mt-3 h-2 w-56 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-white/60">
              Required: {requiredComplete}/{requiredTotal} sections complete
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)]">
          {/* Left: checklist */}
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Your checklist</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Finish anything marked “In progress” or “Not started”, then continue to sign your agreements.
                </p>
              </div>

              <Link
                href="/onboarding"
                className="inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-slate-200 bg-white hover:bg-slate-50"
              >
                Back to onboarding
              </Link>
            </div>

            <ol className="mt-5 space-y-3">
              {sections.map((section) => (
                <li
                  key={section.id}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4 transition hover:bg-slate-50"
                >
                  <div
                    className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black shadow-sm ring-1 ring-slate-200 bg-white"
                    style={{
                      color:
                        section.status === "complete"
                          ? "#059669"
                          : section.status === "in_progress"
                          ? "#b45309"
                          : section.status === "optional"
                          ? "#475569"
                          : "#94a3b8",
                    }}
                  >
                    {iconFor(section.status)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{section.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{section.description}</p>
                      </div>

                      <span
                        className={
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold " +
                          statusPillClasses(section.status)
                        }
                      >
                        {statusLabel(section.status)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={section.href}
                        className="inline-flex items-center rounded-xl px-3 py-2 text-[11px] font-extrabold text-white shadow-sm"
                        style={{
                          background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
                        }}
                      >
                        {section.status === "complete" ? "Review" : "Open"}
                      </Link>

                      {section.optional ? (
                        <span className="text-[11px] text-slate-500">Optional — doesn’t block continuing</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Right: appointment + continue */}
          <section className="space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Review call</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Optional. Book a time if you want to speak with a tax pro before filing.
                  </p>
                </div>

                <Link
                  href="/onboarding/schedule"
                  className="text-[11px] font-extrabold hover:opacity-80"
                  style={{ color: BRAND.primary }}
                >
                  Schedule / change
                </Link>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <AppointmentSummary />
              </div>

              {!hasScheduledAppointment ? (
                <p className="mt-3 text-[11px] text-slate-500">
                  No appointment scheduled. You can still continue and sign agreements.
                </p>
              ) : null}
            </div>

            <div
              className="rounded-3xl p-5 text-white shadow-sm ring-1 ring-white/10"
              style={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              }}
            >
              <h2 className="text-sm font-extrabold">
                {isSubmitted ? "Onboarding submitted" : alreadyInAgreements ? "Continue signing" : "Continue to agreements"}
              </h2>
              <p className="mt-1 text-xs text-white/85">
                {isSubmitted
                  ? "We received your onboarding. Your tax pro will review and reach out if anything else is needed."
                  : alreadyInAgreements
                  ? "You’re already on the agreements step. Finish signing to submit."
                  : readyToContinue
                  ? "Everything required is complete. Next you’ll sign your engagement + payment consent."
                  : "Complete the required sections first. Scheduling is optional."}
              </p>

              <div className="mt-4 space-y-2">
                {isSubmitted ? (
                  <Link
                    href={dashboardHref}
                    className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-xs font-extrabold ring-1 ring-white/20 bg-white/15 hover:bg-white/25"
                  >
                    Go to dashboard
                  </Link>
                ) : alreadyInAgreements ? (
                  <Link
                    href="/onboarding/agreements"
                    className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-xs font-extrabold ring-1 ring-white/20 bg-white/15 hover:bg-white/25"
                  >
                    Go to agreements
                  </Link>
                ) : (
                  <form action={continueToAgreements}>
                    <button
                      type="submit"
                      disabled={!readyToContinue}
                      className={[
                        "inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-xs font-extrabold",
                        "ring-1 ring-white/20",
                        !readyToContinue
                          ? "bg-white/20 opacity-70 cursor-not-allowed"
                          : "bg-white/15 hover:bg-white/25",
                      ].join(" ")}
                    >
                      {readyToContinue ? "Continue to agreements" : "Complete required sections to continue"}
                    </button>
                  </form>
                )}

                <p className="text-[11px] text-white/80 text-center">
                  You’ll submit after signing your agreements.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900">What happens next?</h3>
              <ul className="mt-2 space-y-2 text-xs text-slate-600">
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-block h-2 w-2 rounded-full" style={{ background: BRAND.primary }} />
                  <span>You sign engagement + payment consent.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-block h-2 w-2 rounded-full" style={{ background: BRAND.accent }} />
                  <span>We review your docs + answers.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-slate-300" />
                  <span>We prepare your return and confirm before filing.</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <p className="text-[11px] text-center text-slate-500">
          You can always come back later to upload more documents or update answers.
        </p>
      </div>
    </main>
  );
}
