"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { users, dependents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerRole } from "@/lib/auth/roleServer";

// ---------- helpers ----------
function clean(v: unknown, max = 5000) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

function digitsOnly(v: unknown) {
  return String(v ?? "").replace(/\D/g, "");
}

function normalizeDobYYYYMMDD(v: unknown) {
  const s = clean(v, 10);
  if (!s || s.length !== 10 || s[4] !== "-" || s[7] !== "-") return "";
  return s; // YYYY-MM-DD
}

// keep yes/no/unsure (safe even if UI is only yes/no)
type YNU = "yes" | "no" | "unsure" | "";
function getYNU(fd: FormData, name: string): YNU {
  const v = clean(fd.get(name), 10).toLowerCase();
  return v === "yes" || v === "no" || v === "unsure" ? (v as YNU) : "";
}

function getNum(fd: FormData, name: string) {
  const v = clean(fd.get(name), 20);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapFilingStatus(code: string) {
  switch (code) {
    case "single":
      return "Single";
    case "mfj":
      return "Married Filing Jointly";
    case "mfs":
      return "Married Filing Separately";
    case "hoh":
      return "Head of Household";
    case "qw":
      return "Qualifying Widow(er)";
    default:
      return "";
  }
}

/**
 * Encrypt SSN if SSN_ENCRYPTION_KEY is provided (base64 32 bytes).
 * Stores as: iv.tag.data (base64 segments)
 */
function encryptSSN(ssnDigits: string): string {
  const keyB64 = process.env.SSN_ENCRYPTION_KEY;
  if (!keyB64) throw new Error("SSN_ENCRYPTION_KEY is not set.");

  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("SSN_ENCRYPTION_KEY must be 32 bytes base64.");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const enc = Buffer.concat([cipher.update(ssnDigits, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

type DependentInput = {
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: string;
  relationship: string;
  ssn: string;
};

function parseDependentsJson(raw: string): DependentInput[] {
  if (!raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    throw new Error("Invalid dependents payload.");
  }
  if (!Array.isArray(arr)) return [];

  // cap for safety
  return arr.slice(0, 20).map((d) => {
    const o = (d ?? {}) as Record<string, unknown>;
    return {
      firstName: clean(o.firstName, 60),
      middleName: clean(o.middleName, 60),
      lastName: clean(o.lastName, 60),
      dob: clean(o.dob, 10),
      relationship: clean(o.relationship, 40),
      ssn: clean(o.ssn, 20),
    };
  });
}

export async function saveQuestions(formData: FormData) {
  // ✅ source of truth: cookie tokens
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const emailFromCookie = auth?.email ? String(auth.email).trim().toLowerCase() : "";

  if (!sub) throw new Error("Unauthorized. Please sign in again.");

  // Optional: enforce hidden fields match
  const bodySub = clean(formData.get("cognitoSub"), 200);
  if (bodySub && bodySub !== sub) throw new Error("Forbidden.");

  const emailFromBody = clean(formData.get("email"), 255).toLowerCase();
  const email = emailFromCookie || emailFromBody;
  if (!email) throw new Error("Missing email. Please sign in again.");

  // ---------- read fields ----------
  const filingStatusCode = clean(formData.get("filingStatus"), 30);
  const filingStatusLabel = mapFilingStatus(filingStatusCode);

  const hasDependents = getYNU(formData, "hasDependents") || null;
  const dependentsCount = getNum(formData, "dependentsCount");

  // dependents JSON from your page
  const dependentsJson = clean(formData.get("dependentsJson"), 20000);
  const dependentInputs =
    hasDependents === "yes" ? parseDependentsJson(dependentsJson) : [];

  // if they said YES, require at least 1 dependent entry
  if (hasDependents === "yes" && dependentInputs.length === 0) {
    throw new Error("You selected yes for dependents — please add at least one dependent.");
  }

  // validate + encrypt dependents
  const dependentRows = dependentInputs.map((d, idx) => {
    const firstName = clean(d.firstName, 60);
    const middleName = clean(d.middleName ?? "", 60) || null;
    const lastName = clean(d.lastName, 60);
    const dob = normalizeDobYYYYMMDD(d.dob);
    const relationship = clean(d.relationship, 40);
    const ssnDigits = digitsOnly(d.ssn);

    if (!firstName) throw new Error(`Dependent #${idx + 1}: first name is required.`);
    if (!lastName) throw new Error(`Dependent #${idx + 1}: last name is required.`);
    if (!dob) throw new Error(`Dependent #${idx + 1}: DOB is required.`);
    if (!relationship) throw new Error(`Dependent #${idx + 1}: relationship is required.`);
    if (ssnDigits.length !== 9) throw new Error(`Dependent #${idx + 1}: SSN must be 9 digits.`);

    return {
      firstName,
      middleName,
      lastName,
      dob,
      relationship,
      ssnEncrypted: encryptSSN(ssnDigits),
    };
  });

  const intake = {
    filingStatusCode: filingStatusCode || null,
    filingStatus: filingStatusLabel || null,

    hasDependents,
    dependentsCount,

    workedW2: getYNU(formData, "workedW2") || null,
    hasSelfEmployment: getYNU(formData, "hasSelfEmployment") || null,
    hasGigIncome: getYNU(formData, "hasGigIncome") || null,
    hasInvestments: getYNU(formData, "hasInvestments") || null,
    hasRetirement: getYNU(formData, "hasRetirement") || null,
    hasUnemployment: getYNU(formData, "hasUnemployment") || null,
    hasOtherIncome: getYNU(formData, "hasOtherIncome") || null,

    paidChildcare: getYNU(formData, "paidChildcare") || null,
    paidEducation: getYNU(formData, "paidEducation") || null,
    hasStudentLoans: getYNU(formData, "hasStudentLoans") || null,
    hadMedicalExpenses: getYNU(formData, "hadMedicalExpenses") || null,
    donatedToCharity: getYNU(formData, "donatedToCharity") || null,
    ownsHome: getYNU(formData, "ownsHome") || null,
    contributedRetirement: getYNU(formData, "contributedRetirement") || null,

    movedLastYear: getYNU(formData, "movedLastYear") || null,
    marriageDivorce: clean(formData.get("marriageDivorce"), 30) || null,
    hadBaby: getYNU(formData, "hadBaby") || null,
    gotIrsLetter: getYNU(formData, "gotIrsLetter") || null,

    mainGoal: clean(formData.get("mainGoal"), 80) || null,
    extraNotes: clean(formData.get("extraNotes"), 5000) || null,
  };

  const intakeJson = JSON.stringify(intake);

  // ✅ Ensure user exists, then fetch id
  await db
    .insert(users)
    .values({
      cognitoSub: sub,
      email,
      onboardingStep: "QUESTIONS" as any,
      updatedAt: new Date(),
    } as any)
    .onConflictDoUpdate({
      target: users.cognitoSub,
      set: { email, updatedAt: new Date() },
    });

  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!u?.id) throw new Error("User not found.");

  // ✅ Transaction: update intake + replace dependents
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        email,
        ...(filingStatusLabel ? { filingStatus: filingStatusLabel } : {}),
        bio: intakeJson, // (later: move this to a jsonb column like taxIntake)
        onboardingStep: "SCHEDULE" as any,
        updatedAt: new Date(),
      })
      .where(eq(users.cognitoSub, sub));

    // replace dependents each save
    await tx.delete(dependents).where(eq(dependents.userId, u.id));

    if (dependentRows.length) {
      await tx.insert(dependents).values(
        dependentRows.map((r) => ({
          userId: u.id,
          firstName: r.firstName,
          middleName: r.middleName,
          lastName: r.lastName,
          dob: r.dob as any,
          relationship: r.relationship,
          ssnEncrypted: r.ssnEncrypted,
        }))
      );
    }
  });

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/questions");
  revalidatePath("/onboarding/schedule");
  revalidatePath("/profile");

  redirect("/onboarding/schedule");
}
