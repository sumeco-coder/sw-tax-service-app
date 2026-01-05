// app/(client)/(protected)/onboarding/agreements/actions.ts
"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { users, clientAgreements } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import {
  AGREEMENT_TEXT,
  AGREEMENT_VERSION,
  type AgreementKind,
} from "@/lib/legal/agreements";

/* ---------------- helpers ---------------- */

function sha256(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

// 2026 filing season => 2025 tax year
function getTaxYear() {
  return String(new Date().getFullYear() - 1);
}

const ALL_KINDS = ["ENGAGEMENT", "CONSENT_7216_USE", "CONSENT_PAYMENT"] as const;

async function auditTrail() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent") ?? null;
  return { ip, userAgent };
}

async function requireUserRow() {
  const auth = await getServerRole();
  if (!auth) return redirect("/sign-in");

  const sub = String(auth.sub ?? "");
  if (!sub) return redirect("/sign-in");

  const email = String(auth.email ?? "").trim().toLowerCase();
  if (!email) return redirect("/sign-in"); // email is NOT NULL in DB

  const [u] = await db
    .select({
      id: users.id,
      onboardingStep: users.onboardingStep,
      cognitoSub: users.cognitoSub,
      email: users.email,
    })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  // ✅ If missing, create it (instead of redirecting)
  if (!u) {
    const [created] = await db
      .insert(users)
      .values({
        cognitoSub: sub,
        email,
        // onboardingStep has default("PROFILE") in schema, so no need to set it
        updatedAt: new Date(),
      })
      .returning({
        id: users.id,
        onboardingStep: users.onboardingStep,
        cognitoSub: users.cognitoSub,
        email: users.email,
      });

    if (!created) return redirect("/onboarding"); // safety fallback
    return { auth, user: created };
  }

  // ✅ keep email in sync (optional but recommended)
  if (u.email !== email) {
    await db
      .update(users)
      .set({ email, updatedAt: new Date() })
      .where(eq(users.id, u.id));
  }

  return { auth, user: { ...u, email } };
}


/* ---------------- actions ---------------- */

/**
 * Called from SUMMARY → sets step to AGREEMENTS and redirects
 */
export async function startAgreements() {
  const { user } = await requireUserRow();

  const step = String(user.onboardingStep ?? "");

  // If they’re already finished, just send them out
  if (step === "SUBMITTED" || step === "DONE") {
    redirect("/profile");
  }

  // Only allow entry from SUMMARY (or if already on AGREEMENTS)
  if (step !== "SUMMARY" && step !== "AGREEMENTS") {
    redirect("/onboarding/summary");
  }

  if (step !== "AGREEMENTS") {
    await db
      .update(users)
      .set({ onboardingStep: "AGREEMENTS" as any, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    revalidatePath("/onboarding");
    revalidatePath("/onboarding/summary");
    revalidatePath("/onboarding/agreements");
  }

  redirect("/onboarding/agreements");
}

/**
 * Save single agreement signature (append-only)
 */
export async function signAgreement(input: {
  kind: AgreementKind;
  taxpayerName: string;
  spouseRequired: boolean;
  spouseName?: string;
  decision?: "SIGNED" | "GRANTED" | "DECLINED" | "SKIPPED";
}) {
  const { user } = await requireUserRow();

  const currentStep = String(user.onboardingStep ?? "");
  if (currentStep !== "AGREEMENTS" && currentStep !== "SUMMARY") {
    redirect("/onboarding/summary");
  }

  const kind = input.kind;
  const text = AGREEMENT_TEXT[kind];
  if (!text) throw new Error("Agreement text missing.");

  const taxpayerName = String(input.taxpayerName ?? "").trim();
  const spouseRequired = Boolean(input.spouseRequired);
  const spouseName = String(input.spouseName ?? "").trim();

  if (taxpayerName.length < 5) throw new Error("Enter taxpayer full legal name.");
  if (spouseRequired && spouseName.length < 5) {
    throw new Error("Enter spouse full legal name.");
  }

  const decision =
    input.decision ?? (kind === "CONSENT_7216_USE" ? "SKIPPED" : "SIGNED");

  const now = new Date();
  const { ip, userAgent } = await auditTrail();

  await db.insert(clientAgreements).values({
    userId: String(user.id),
    taxYear: getTaxYear(),
    kind,
    version: AGREEMENT_VERSION,
    contentHash: sha256(text),
    decision,

    taxpayerName,
    taxpayerSignedAt: now,

    spouseRequired,
    spouseName: spouseRequired ? spouseName : null,
    spouseSignedAt: spouseRequired ? now : null,

    ip,
    userAgent,
  });

  revalidatePath("/onboarding/agreements");
  revalidatePath("/onboarding");
}

/**
 * Final submit — validates latest of each kind, sets step to SUBMITTED, then redirects
 */
export async function submitAgreementsAndFinish() {
  const { user } = await requireUserRow();

  const step = String(user.onboardingStep ?? "");
  if (step !== "AGREEMENTS") redirect("/onboarding/agreements");

  const taxYear = getTaxYear();

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
        eq(clientAgreements.userId, String(user.id)),
        eq(clientAgreements.taxYear, taxYear),
        inArray(clientAgreements.kind, ALL_KINDS as any)
      )
    )
    .orderBy(desc(clientAgreements.createdAt));

  // newest first → latest per kind
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(String(r.kind))) latest.set(String(r.kind), r);

  const engagement = latest.get("ENGAGEMENT");
  const payment = latest.get("CONSENT_PAYMENT");
  const consent = latest.get("CONSENT_7216_USE");

  const okEngagement =
    Boolean(engagement?.taxpayerSignedAt) &&
    (!engagement?.spouseRequired || Boolean(engagement?.spouseSignedAt));

  const okPayment =
    Boolean(payment?.taxpayerSignedAt) &&
    (!payment?.spouseRequired || Boolean(payment?.spouseSignedAt));

  const consentDecision = String(consent?.decision ?? "");
  if (consentDecision === "DECLINED") {
    throw new Error('You selected “I do not consent.” The onboarding cannot continue.');
  }

  const okConsent =
    Boolean(consent?.taxpayerSignedAt) &&
    (consentDecision === "GRANTED" || consentDecision === "SKIPPED");

  if (!okEngagement || !okPayment || !okConsent) {
    throw new Error("Please complete all required agreements to continue.");
  }

  await db
    .update(users)
    .set({ onboardingStep: "SUBMITTED" as any, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/agreements");
  revalidatePath("/onboarding/complete");

  redirect("/onboarding/complete");
}
