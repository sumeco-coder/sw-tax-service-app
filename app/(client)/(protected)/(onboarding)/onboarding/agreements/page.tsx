// app/(client)/(protected)/onboarding/agreements/page.tsx
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users, clientAgreements } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import AgreementsClient from "./_components/AgreementsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const KINDS = ["ENGAGEMENT", "CONSENT_7216_USE", "CONSENT_PAYMENT"] as const;

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

type OnboardingStep = (typeof users.$inferSelect)["onboardingStep"];

function getTaxYear() {
  // keep consistent with your actions.ts
  return String(new Date().getFullYear());
}

function getStepIndex(step: OnboardingStep) {
  if (!step) return 0;
  const idx = STEP_ORDER.indexOf(step as any);
  return idx === -1 ? 0 : idx;
}

export default async function AgreementsPage() {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  if (!sub) redirect("/sign-in");

  const [u] = await db
    .select({ id: users.id, onboardingStep: users.onboardingStep })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!u) redirect("/onboarding");

   const step = (u.onboardingStep as unknown as OnboardingStep) ?? null;

  // If already submitted, go dashboard
  if (step === "SUBMITTED" || step === "DONE") {
    const next =
      auth?.role === "ADMIN"
        ? "/admin"
        : auth?.role === "LMS_ADMIN"
        ? "/lms"
        : auth?.role === "TAX_PREPARER"
        ? "/preparer"
        : "/profile";
    redirect(next);
  }

  // If they jump here too early (before SUMMARY), send them to onboarding home
  if (getStepIndex(step) < getStepIndex("SUMMARY")) {
    redirect("/onboarding");
  }


  // If they jump here too early, send them back
  if (step !== "AGREEMENTS" && step !== "SUMMARY") {
    redirect("/onboarding/summary");
  }

  const taxYear = getTaxYear();

  // Pull latest signed status per kind (scoped by tax year)
  const rows = await db
    .select({
      kind: clientAgreements.kind,
      decision: clientAgreements.decision,
      taxpayerSignedAt: clientAgreements.taxpayerSignedAt,
      spouseRequired: clientAgreements.spouseRequired,
      spouseSignedAt: clientAgreements.spouseSignedAt,
      createdAt: clientAgreements.createdAt,
    })
    .from(clientAgreements)
    .where(
      and(
        eq(clientAgreements.userId, String(u.id)), // ✅ userId is TEXT
        eq(clientAgreements.taxYear, taxYear), // ✅ taxYear required in your schema
        inArray(clientAgreements.kind, KINDS as any)
      )
    )
    .orderBy(desc(clientAgreements.createdAt));

  // newest first → keep latest per kind
  const latest: Record<string, any> = {};
  for (const r of rows) {
    if (!latest[r.kind]) latest[r.kind] = r;
  }

  const initial = {
    ENGAGEMENT: latest.ENGAGEMENT
      ? {
          decision: latest.ENGAGEMENT.decision ?? null,
          taxpayerSignedAt:
            latest.ENGAGEMENT.taxpayerSignedAt?.toISOString?.() ?? null,
          spouseRequired: Boolean(latest.ENGAGEMENT.spouseRequired),
          spouseSignedAt:
            latest.ENGAGEMENT.spouseSignedAt?.toISOString?.() ?? null,
        }
      : null,

    CONSENT_7216_USE: latest.CONSENT_7216_USE
      ? {
          decision: latest.CONSENT_7216_USE.decision ?? null,
          taxpayerSignedAt:
            latest.CONSENT_7216_USE.taxpayerSignedAt?.toISOString?.() ?? null,
          spouseRequired: Boolean(latest.CONSENT_7216_USE.spouseRequired),
          spouseSignedAt:
            latest.CONSENT_7216_USE.spouseSignedAt?.toISOString?.() ?? null,
        }
      : null,

    CONSENT_PAYMENT: latest.CONSENT_PAYMENT
      ? {
          decision: latest.CONSENT_PAYMENT.decision ?? null,
          taxpayerSignedAt:
            latest.CONSENT_PAYMENT.taxpayerSignedAt?.toISOString?.() ?? null,
          spouseRequired: Boolean(latest.CONSENT_PAYMENT.spouseRequired),
          spouseSignedAt:
            latest.CONSENT_PAYMENT.spouseSignedAt?.toISOString?.() ?? null,
        }
      : null,
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <AgreementsClient initial={initial} taxYear={taxYear} />

      </div>
    </main>
  );
}

