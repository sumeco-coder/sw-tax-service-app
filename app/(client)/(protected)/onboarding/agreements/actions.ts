// app/(client)/onboarding/agreements/actions.ts
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
  AgreementKind,
} from "@/lib/legal/agreements";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function getTaxYear() {
  return String(new Date().getFullYear());
}

async function auditTrail() {
  const h = await headers(); // ✅ Next 15 typing

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

  const [u] = await db
    .select({
      id: users.id,
      onboardingStep: users.onboardingStep,
      cognitoSub: users.cognitoSub,
    })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!u) return redirect("/onboarding");

  return { auth, user: u };
}

export async function signAgreement(input: {
  kind: AgreementKind;
  taxpayerName: string;
  spouseRequired: boolean;
  spouseName?: string;
  decision?: "SIGNED" | "GRANTED" | "DECLINED" | "SKIPPED";
}) {
  const { user } = await requireUserRow();

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

export async function finalizeAgreementsAndSubmit() {
  const { auth, user } = await requireUserRow();

  // ✅ TS-safe step check (avoids “no overlap” even if TS union is stale)
  const step = String(user.onboardingStep ?? "");
  if (step !== "AGREEMENTS") {
    return redirect("/onboarding/agreements");
  }

  const taxYear = getTaxYear();

  const REQUIRED = ["ENGAGEMENT", "CONSENT_PAYMENT"] as const;

  const rows = await db
    .select({
      kind: clientAgreements.kind,
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
        inArray(clientAgreements.kind, REQUIRED as any)
      )
    )
    .orderBy(desc(clientAgreements.createdAt));

  // newest-first → take first per kind
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!latest.has(r.kind)) latest.set(r.kind, r);
  }

  const engagement = latest.get("ENGAGEMENT");
  const payment = latest.get("CONSENT_PAYMENT");

  const okEngagement =
    Boolean(engagement?.taxpayerSignedAt) &&
    (!engagement?.spouseRequired || Boolean(engagement?.spouseSignedAt));

  const okPayment =
    Boolean(payment?.taxpayerSignedAt) &&
    (!payment?.spouseRequired || Boolean(payment?.spouseSignedAt));

  if (!okEngagement || !okPayment) {
    throw new Error("Please sign the required agreements to continue.");
  }

  await db
    .update(users)
    .set({ onboardingStep: "SUBMITTED", updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/summary");
  revalidatePath("/onboarding/agreements");
  revalidatePath("/profile");

  const next =
    auth.role === "ADMIN"
      ? "/admin"
      : auth.role === "LMS_ADMIN"
      ? "/lms"
      : auth.role === "TAX_PREPARER"
      ? "/preparer"
      : "/profile";

  redirect(next);
}
