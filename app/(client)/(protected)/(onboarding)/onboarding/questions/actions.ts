// app/(client)/(protected)/onboarding/questions/actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { users, dependents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerRole } from "@/lib/auth/roleServer";

/* ---------------- helpers ---------------- */

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

  const [yStr, mStr, dStr] = s.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return "";
  if (y < 1900 || y > 2100) return "";
  if (m < 1 || m > 12) return "";
  if (d < 1 || d > 31) return "";

  return s;
}

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

function decodeKey32(key: string) {
  const k = String(key ?? "").trim();
  if (!k) throw new Error("SSN_ENCRYPTION_KEY is not set.");

  // Accept BOTH base64 and base64url (because you used base64url generator)
  let buf: Buffer | null = null;

  try {
    buf = Buffer.from(k, "base64url");
  } catch {
    buf = null;
  }

  if (!buf || buf.length !== 32) {
    try {
      buf = Buffer.from(k, "base64");
    } catch {
      buf = null;
    }
  }

  if (!buf || buf.length !== 32) {
    throw new Error("SSN_ENCRYPTION_KEY must decode to 32 bytes (base64 or base64url).");
  }

  return buf;
}

function encryptSSN(ssnDigits: string): string {
  const key = decodeKey32(process.env.SSN_ENCRYPTION_KEY!);

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
    throw new Error(
      "Dependents data is invalid. Please refresh and try again."
    );
  }

  if (!Array.isArray(arr)) return [];

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

/* ---------------- action ---------------- */

export async function saveQuestions(formData: FormData) {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  if (!sub) throw new Error("Unauthorized. Please sign in again.");

  // email is nice-to-have; don't hard fail if missing
  let email = auth?.email ? String(auth.email).trim().toLowerCase() : "";

  const filingStatusCode = clean(formData.get("filingStatus"), 30);
  const filingStatusLabel = mapFilingStatus(filingStatusCode);

  const hasDependents = getYNU(formData, "hasDependents") || null;
  const dependentsCount = getNum(formData, "dependentsCount");

  const dependentsJson = clean(formData.get("dependentsJson"), 200000);
  const dependentInputs =
    hasDependents === "yes" ? parseDependentsJson(dependentsJson) : [];

  if (hasDependents === "yes" && dependentInputs.length === 0) {
    throw new Error(
      "You selected yes for dependents — please add at least one dependent."
    );
  }

  const dependentRows = dependentInputs.map((d, idx) => {
    const firstName = clean(d.firstName, 60);
    const middleName = clean(d.middleName ?? "", 60);
    const lastName = clean(d.lastName, 60);
    const dob = normalizeDobYYYYMMDD(d.dob);
    const relationship = clean(d.relationship, 40);
    const ssnDigits = digitsOnly(d.ssn);

    if (!firstName)
      throw new Error(`Dependent #${idx + 1}: first name is required.`);
    if (!lastName)
      throw new Error(`Dependent #${idx + 1}: last name is required.`);
    if (!dob) throw new Error(`Dependent #${idx + 1}: DOB must be YYYY-MM-DD.`);
    if (!relationship)
      throw new Error(`Dependent #${idx + 1}: relationship is required.`);
    if (ssnDigits.length !== 9)
      throw new Error(`Dependent #${idx + 1}: SSN must be 9 digits.`);

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

  const answeredSomething =
    Boolean(intake.filingStatusCode) ||
    intake.hasDependents !== null ||
    Boolean(intake.dependentsCount) ||
    dependentRows.length > 0 ||
    // income
    intake.workedW2 !== null ||
    intake.hasSelfEmployment !== null ||
    intake.hasGigIncome !== null ||
    intake.hasInvestments !== null ||
    intake.hasRetirement !== null ||
    intake.hasUnemployment !== null ||
    intake.hasOtherIncome !== null ||
    // deductions
    intake.paidChildcare !== null ||
    intake.paidEducation !== null ||
    intake.hasStudentLoans !== null ||
    intake.hadMedicalExpenses !== null ||
    intake.donatedToCharity !== null ||
    intake.ownsHome !== null ||
    intake.contributedRetirement !== null ||
    // life events
    intake.movedLastYear !== null ||
    Boolean(intake.marriageDivorce) ||
    intake.hadBaby !== null ||
    intake.gotIrsLetter !== null ||
    Boolean(intake.mainGoal) ||
    Boolean(intake.extraNotes);

  if (!answeredSomething) {
    throw new Error("Please answer at least one question before continuing.");
  }

  await db.transaction(async (tx) => {
    // upsert user and move step forward
    await tx
      .insert(users)
      .values({
        cognitoSub: sub,
        ...(email ? { email } : {}),
        onboardingStep: "SCHEDULE" as any,
        ...(filingStatusLabel ? { filingStatus: filingStatusLabel } : {}),
        bio: intakeJson,
        updatedAt: new Date(),
      } as any)
      .onConflictDoUpdate({
        target: users.cognitoSub,
        set: {
          ...(email ? { email } : {}), // don't overwrite with empty
          onboardingStep: "SCHEDULE" as any,
          ...(filingStatusLabel ? { filingStatus: filingStatusLabel } : {}),
          bio: intakeJson,
          updatedAt: new Date(),
        } as any,
      });

    const [u] = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.cognitoSub, sub))
      .limit(1);

    if (!u?.id) throw new Error("User not found.");

    // if auth email was missing, keep DB email (no crash)
    if (!email && u.email) email = u.email;

    await tx.delete(dependents).where(eq(dependents.userId, u.id));

    if (dependentRows.length) {
      await tx.insert(dependents).values(
        dependentRows.map((r) => ({
          userId: u.id,
          firstName: r.firstName,
          middleName: r.middleName,
          lastName: r.lastName,
          dob: r.dob,
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
