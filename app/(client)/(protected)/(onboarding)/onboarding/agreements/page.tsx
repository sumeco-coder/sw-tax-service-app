// app/(client)/(protected)/onboarding/agreements/page.tsx
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users, clientAgreements } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import AgreementsClient from "./_components/AgreementsClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

function ErrorShell({ taxYear }: { taxYear: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Card className="rounded-2xl">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="secondary">Onboarding</Badge>
                <CardTitle className="mt-2">Agreements</CardTitle>
              </div>
              <Badge variant="outline">Tax year {taxYear}</Badge>
            </div>
            <Separator />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We couldn’t load your agreements right now. Please refresh. If it
              keeps happening, sign out and sign in again.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default async function AgreementsPage() {
  const taxYear = getTaxYear();

  let auth: any = null;
  try {
    auth = await getServerRole();
  } catch (e) {
    console.error("getServerRole failed on /onboarding/agreements", e);
    auth = null;
  }

   const sub = auth?.sub ? String(auth.sub) : "";
  if (!sub) redirect(`/sign-in?next=/onboarding/agreements`);

  let u: { id: string; onboardingStep: OnboardingStep } | undefined;
  try {
    [u] = await db
      .select({ id: users.id, onboardingStep: users.onboardingStep })
      .from(users)
      .where(eq(users.cognitoSub, sub))
      .limit(1);
  } catch (e) {
    console.error("DB error loading user for agreements", e);
    return <ErrorShell taxYear={taxYear} />;
  }

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

  // ✅ Agreement query must never crash the render
  let rows: any[] = [];
  try {
    rows = await db
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
          eq(clientAgreements.userId, String(u.id)),
          eq(clientAgreements.taxYear, taxYear),
          inArray(clientAgreements.kind, KINDS as any)
        )
      )
      .orderBy(desc(clientAgreements.createdAt));
  } catch (e) {
    console.error("DB error loading agreements", e);
    return <ErrorShell taxYear={taxYear} />;
  }

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
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Card className="rounded-2xl">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="secondary">Onboarding</Badge>
                <CardTitle className="mt-2">Agreements</CardTitle>
              </div>
              <Badge variant="outline">Tax year {taxYear}</Badge>
            </div>
            <Separator />
          </CardHeader>

          <CardContent>
            <AgreementsClient initial={initial} taxYear={taxYear} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
