"use server";

import "server-only";

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

const ERR_UNAUTHORIZED = "UNAUTHORIZED";

const ALL_KINDS = ["ENGAGEMENT", "CONSENT_7216_USE", "CONSENT_PAYMENT"] as const;

/** MUST match agreements/page.tsx */
function getTaxYear() {
  return String(new Date().getFullYear());
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

async function auditTrail() {
  const h = await headers();

  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;

  const userAgent = h.get("user-agent") ?? null;

  return { ip, userAgent };
}

function signInRedirect(nextPath: string) {
  redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
}

/**
 * Auth + user row helper
 * - Throws UNAUTHORIZED instead of redirecting (caller decides redirect vs message)
 * - Ensures a user row exists (race-safe)
 */
async function requireUserRow() {
  let auth: Awaited<ReturnType<typeof getServerRole>> = null;

  try {
    auth = await getServerRole();
  } catch (e) {
    console.error("getServerRole failed in onboarding/agreements/actions", e);
    auth = null;
  }

  const sub = auth?.sub ? String(auth.sub).trim() : "";
  if (!sub) throw new Error(ERR_UNAUTHORIZED);

  const email = String(auth?.email ?? "").trim().toLowerCase();
  if (!email) throw new Error(ERR_UNAUTHORIZED);

  // 1) Select
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

  if (u) {
    // keep email synced (non-fatal)
    if (String(u.email ?? "").trim().toLowerCase() !== email) {
      try {
        await db
          .update(users)
          .set({ email, updatedAt: new Date() })
          .where(eq(users.id, u.id));
      } catch (e) {
        console.error("[requireUserRow] email sync failed", e);
      }
    }

    return { auth, user: { ...u, email } };
  }

  // 2) Insert (race-safe)
  try {
    const [created] = await db
      .insert(users)
      .values({
        cognitoSub: sub,
        email,
        updatedAt: new Date(),
      })
      .returning({
        id: users.id,
        onboardingStep: users.onboardingStep,
        cognitoSub: users.cognitoSub,
        email: users.email,
      });

    if (!created) throw new Error("USER_CREATE_FAILED");
    return { auth, user: { ...created, email } };
  } catch (e) {
    // If unique conflict happened, re-select
    const [raced] = await db
      .select({
        id: users.id,
        onboardingStep: users.onboardingStep,
        cognitoSub: users.cognitoSub,
        email: users.email,
      })
      .from(users)
      .where(eq(users.cognitoSub, sub))
      .limit(1);

    if (!raced) throw e;

    if (String(raced.email ?? "").trim().toLowerCase() !== email) {
      try {
        await db
          .update(users)
          .set({ email, updatedAt: new Date() })
          .where(eq(users.id, raced.id));
      } catch {}
    }

    return { auth, user: { ...raced, email } };
  }
}

/* ---------------- actions ---------------- */

export async function startAgreements() {
  let user: Awaited<ReturnType<typeof requireUserRow>>["user"];

  try {
    ({ user } = await requireUserRow());
  } catch (e: any) {
    if (String(e?.message) === ERR_UNAUTHORIZED) {
      signInRedirect("/onboarding/agreements");
    }
    throw e;
  }

  const step = String(user.onboardingStep ?? "");

  if (step === "SUBMITTED" || step === "DONE") redirect("/profile");

  if (step !== "SUMMARY" && step !== "AGREEMENTS") redirect("/onboarding/summary");

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

export async function signAgreement(input: {
  kind: AgreementKind;
  taxpayerName: string;
  spouseRequired: boolean;
  spouseName?: string;
  decision?: "SIGNED" | "GRANTED" | "DECLINED" | "SKIPPED";
}) {
  let user: Awaited<ReturnType<typeof requireUserRow>>["user"];

  try {
    ({ user } = await requireUserRow());
  } catch (e: any) {
    if (String(e?.message) === ERR_UNAUTHORIZED) {
      // client catches this and shows alert
      throw new Error("Please sign in again.");
    }
    throw e;
  }

  const currentStep = String(user.onboardingStep ?? "");
  if (currentStep !== "AGREEMENTS" && currentStep !== "SUMMARY") {
    throw new Error("Please return to the onboarding summary to continue.");
  }

  const kind = input.kind;
  const text = AGREEMENT_TEXT[kind];
  if (!text) throw new Error("Agreement text missing.");

  const taxpayerName = String(input.taxpayerName ?? "").trim();
  const spouseRequired = Boolean(input.spouseRequired);
  const spouseName = String(input.spouseName ?? "").trim();

  if (taxpayerName.length < 5) throw new Error("Enter taxpayer full legal name.");
  if (spouseRequired && spouseName.length < 5) throw new Error("Enter spouse full legal name.");

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
 * IMPORTANT:
 * Used as <form action={submitAgreementsAndFinish}>.
 * Must not throw on expected failures — redirect with ?err=...
 */
export async function submitAgreementsAndFinish() {
  let user: Awaited<ReturnType<typeof requireUserRow>>["user"];

  try {
    ({ user } = await requireUserRow());
  } catch (e: any) {
    if (String(e?.message) === ERR_UNAUTHORIZED) {
      signInRedirect("/onboarding/agreements");
    }
    console.error("[submitAgreementsAndFinish] auth failed", e);
    redirect("/onboarding/agreements?err=auth_failed");
  }

  const step = String(user.onboardingStep ?? "");
  if (step !== "AGREEMENTS") redirect("/onboarding/agreements?err=wrong_step");

  const taxYear = getTaxYear();

  let rows: any[] = [];
  try {
    rows = await db
      .select({
        id: clientAgreements.id,
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
      .orderBy(desc(clientAgreements.createdAt), desc(clientAgreements.id));
  } catch (e) {
    console.error("[submitAgreementsAndFinish] DB read failed", e);
    redirect("/onboarding/agreements?err=db_read_failed");
  }

  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = String(r.kind);
    if (!latest.has(k)) latest.set(k, r);
  }

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
    redirect("/onboarding/agreements?err=consent_declined");
  }

  const okConsent =
    Boolean(consent?.taxpayerSignedAt) &&
    (consentDecision === "GRANTED" || consentDecision === "SKIPPED");

  if (!okEngagement || !okPayment || !okConsent) {
    redirect("/onboarding/agreements?err=incomplete");
  }

  try {
    await db
      .update(users)
      .set({ onboardingStep: "SUBMITTED" as any, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  } catch (e) {
    console.error("[submitAgreementsAndFinish] step update failed", e);
    redirect("/onboarding/agreements?err=save_failed");
  }

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/agreements");
  revalidatePath("/onboarding/complete");

  redirect("/onboarding/complete");
}
