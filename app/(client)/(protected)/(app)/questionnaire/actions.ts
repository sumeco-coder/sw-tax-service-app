// app/(client)/(protected)/(app)/questionnaire/actions.ts
"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/drizzle/db";
import {
  users,
  dependents,
  dependentQuestionnaires,
  directDeposit,
  educationCredits,
  headOfHouseholdDocs,
  identification,
  estimatedTaxPayments,
  estimatedStateTaxPayments,
  incomeDocumentation,
  qualifyingChildren,
  foreignAccountsDigitalAssets,
} from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

function clean(v: unknown, max = 255) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}
function normalizeEmail(v: unknown) {
  return clean(v, 255).toLowerCase();
}

function safeInternalPath(input: string | null | undefined, fallback: string) {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("://")) return fallback;
  return raw;
}

async function requireAuthUser() {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const email = auth?.email ? normalizeEmail(auth.email) : "";
  if (!sub) return null;
  return { sub, email };
}

async function getOrCreateUserBySub(cognitoSub: string, email?: string) {
  const [existing] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing) {
    if (email && email !== existing.email) {
      const [updated] = await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning({ id: users.id, email: users.email });
      return updated ?? existing;
    }
    return existing;
  }

  if (!email) throw new Error("Missing email. Please sign in again.");

  const [created] = await db
    .insert(users)
    .values({ cognitoSub, email, updatedAt: new Date() } as any)
    .returning({ id: users.id, email: users.email });

  return created;
}

/**
 * SERVER PREFILL: fetch saved values so client components can render instantly.
 * Keep sensitive fields out (no full routing/account numbers, no encrypted ids, etc.)
 */
export async function getQuestionnairePrefill() {
  const auth = await requireAuthUser();
  if (!auth) redirect("/sign-in");

  const u = await getOrCreateUserBySub(auth.sub, auth.email);

  // ---------------- Direct Deposit (safe fields only) ----------------
  const [dd] = await db
    .select({
      useDirectDeposit: directDeposit.useDirectDeposit,
      accountHolderName: directDeposit.accountHolderName,
      bankName: directDeposit.bankName,
      accountType: directDeposit.accountType,
      routingLast4: directDeposit.routingLast4,
      accountLast4: directDeposit.accountLast4,
      updatedAt: directDeposit.updatedAt,
    })
    .from(directDeposit)
    .where(eq(directDeposit.userId, u.id))
    .limit(1);

  // ---------------- JSON sections (unique-per-user) ----------------
  const [edu] = await db
    .select({
      payload: educationCredits.payload,
      updatedAt: educationCredits.updatedAt,
    })
    .from(educationCredits)
    .where(eq(educationCredits.userId, u.id))
    .limit(1);

  const [hoh] = await db
    .select({
      payload: headOfHouseholdDocs.payload,
      updatedAt: headOfHouseholdDocs.updatedAt,
    })
    .from(headOfHouseholdDocs)
    .where(eq(headOfHouseholdDocs.userId, u.id))
    .limit(1);

  // ---------------- Identification (taxpayer + spouse rows) ----------------
  const ids = await db
    .select({
      person: identification.person,
      type: identification.type,
      issuingState: identification.issuingState,
      issueDate: identification.issueDate,
      expiresOn: identification.expiresOn,
      idLast4: identification.idLast4,
      hasNoId: identification.hasNoId,
      doesNotWantToProvide: identification.doesNotWantToProvide,
      frontKey: identification.frontKey,
      backKey: identification.backKey,
      notes: identification.notes,
      updatedAt: identification.updatedAt,
    })
    .from(identification)
    .where(eq(identification.userId, u.id));

  // ---------------- Misc data blobs ----------------
  const [estFed] = await db
    .select({ data: estimatedTaxPayments.data, updatedAt: estimatedTaxPayments.updatedAt })
    .from(estimatedTaxPayments)
    .where(eq(estimatedTaxPayments.userId, u.id))
    .limit(1);

  const [estState] = await db
    .select({ data: estimatedStateTaxPayments.data, updatedAt: estimatedStateTaxPayments.updatedAt })
    .from(estimatedStateTaxPayments)
    .where(eq(estimatedStateTaxPayments.userId, u.id))
    .limit(1);

  const [income] = await db
    .select({ data: incomeDocumentation.data, updatedAt: incomeDocumentation.updatedAt })
    .from(incomeDocumentation)
    .where(eq(incomeDocumentation.userId, u.id))
    .limit(1);

  const [qc] = await db
    .select({ data: qualifyingChildren.data, updatedAt: qualifyingChildren.updatedAt })
    .from(qualifyingChildren)
    .where(eq(qualifyingChildren.userId, u.id))
    .limit(1);

  const [fa] = await db
    .select({ data: foreignAccountsDigitalAssets.data, updatedAt: foreignAccountsDigitalAssets.updatedAt })
    .from(foreignAccountsDigitalAssets)
    .where(eq(foreignAccountsDigitalAssets.userId, u.id))
    .limit(1);

  // ---------------- Dependents (core + payload + SSN meta) ----------------
  const depRows = await db
    .select({
      dependentId: dependents.id,
      firstName: dependents.firstName,
      middleName: dependents.middleName,
      lastName: dependents.lastName,
      dob: dependents.dob,
      relationship: dependents.relationship,
      monthsInHome: dependents.monthsInHome,
      isStudent: dependents.isStudent,
      isDisabled: dependents.isDisabled,
      appliedButNotReceived: dependents.appliedButNotReceived,

      // used ONLY for meta (not returned to client)
      ssnEncrypted: dependents.ssnEncrypted,
      ssnLast4: (dependents as any).ssnLast4,

      depUpdatedAt: dependents.updatedAt,

      qPayload: dependentQuestionnaires.payload,
      qUpdatedAt: dependentQuestionnaires.updatedAt,
    })
    .from(dependents)
    .leftJoin(
      dependentQuestionnaires,
      and(
        eq(dependentQuestionnaires.dependentId, dependents.id),
        eq(dependentQuestionnaires.userId, u.id)
      )
    )
    .where(eq(dependents.userId, u.id));

  const dependentsPrefill = depRows.map((r) => {
    const ssnOnFile = !!r.ssnEncrypted || !!r.ssnLast4;
    const ssnLast4 = (r as any).ssnLast4 ?? null;

    // Merge: questionnaire payload + core dependent fields
    const values = {
      ...(r.qPayload ?? {}),
      firstName: r.firstName ?? "",
      middleName: r.middleName ?? "",
      lastName: r.lastName ?? "",
      dob: r.dob ? String(r.dob).slice(0, 10) : "",
      relationship: r.relationship ?? "",
      monthsInHome: String(r.monthsInHome ?? 12),
      isStudent: !!r.isStudent,
      isDisabled: !!r.isDisabled,
      appliedButNotReceived: !!r.appliedButNotReceived,

      // meta used by client validation (not shown)
      ssnOnFile,

      // never hydrate SSN into the input
      ssn: "",
    };

    return {
      dependentId: r.dependentId,
      meta: { ssnOnFile, ssnLast4 },
      values,
      updatedAt: r.depUpdatedAt ?? null,
      questionnaireUpdatedAt: r.qUpdatedAt ?? null,
    };
  });

  return {
    userId: u.id,

    directDeposit: dd
      ? {
          useDirectDeposit: Boolean(dd.useDirectDeposit),
          accountHolderName: String(dd.accountHolderName ?? ""),
          bankName: String(dd.bankName ?? ""),
          accountType: dd.accountType === "savings" ? "savings" : "checking",
          routingLast4: String(dd.routingLast4 ?? ""),
          accountLast4: String(dd.accountLast4 ?? ""),
          updatedAt: dd.updatedAt ?? null,
        }
      : null,

    educationCredits: edu?.payload ?? null,
    headOfHouseholdDocs: hoh?.payload ?? null,

    identification: {
      taxpayer: ids.find((x) => x.person === "TAXPAYER") ?? null,
      spouse: ids.find((x) => x.person === "SPOUSE") ?? null,
    },

    estimatedTaxPayments: estFed?.data ?? null,
    estimatedStateTaxPayments: estState?.data ?? null,
    incomeDocumentation: income?.data ?? null,
    qualifyingChildren: qc?.data ?? null,
    foreignAccountsDigitalAssets: fa?.data ?? null,

    // ✅ dependents prefill (core + payload + ssn meta)
    dependents: dependentsPrefill,
  };
}

/** SINGLE SUMMARY PULL for Review page */
export async function getQuestionnaireSummary() {
  const prefill = await getQuestionnairePrefill();
  return { ok: true, values: prefill };
}

/** SAVE & CONTINUE (marks complete + redirects) */
export async function completeQuestionnaire(formData: FormData) {
  const auth = await requireAuthUser();
  if (!auth) redirect("/sign-in");

  const u = await getOrCreateUserBySub(auth.sub, auth.email);

  const next = safeInternalPath(String(formData.get("next") ?? ""), "/dashboard");

  await db
    .update(users)
    .set({
      questionnaireComplete: true,
      questionnaireCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, u.id));

  redirect(next);
}
