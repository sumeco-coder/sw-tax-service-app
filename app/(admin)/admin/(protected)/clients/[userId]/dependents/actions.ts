"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { dependents } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerRole } from "@/lib/auth/roleServer";

function asString(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function asInt(v: FormDataEntryValue | null, fallback: number) {
  const n = Number(typeof v === "string" ? v : "");
  return Number.isFinite(n) ? n : fallback;
}

function asBool(v: FormDataEntryValue | null) {
  return v === "on" || v === "true" || v === "1";
}

function digitsOnly(v: unknown, maxLen: number) {
  return String(v ?? "").replace(/\D/g, "").slice(0, maxLen);
}

function dependentsPath(userId: string) {
  return `/admin/clients/${userId}/dependents`;
}

function requireAdmin(auth: any) {
  const role = String(auth?.role ?? "").toUpperCase();
  return (
    role === "ADMIN" ||
    role === "SUPERADMIN" ||
    role === "LMS_ADMIN" ||
    role === "LMS_PREPARER"
  );
}

async function adminGate() {
  const auth = await getServerRole();
  if (!auth?.sub) throw new Error("Unauthorized");
  if (!requireAdmin(auth)) throw new Error("Forbidden");
  return auth;
}

/** SSN_ENCRYPTION_KEY: hex | base64 | base64url -> 32 bytes */
function readAes256Key(envName: string): Buffer {
  const raw = (process.env[envName] ?? "").trim();
  if (!raw) throw new Error(`Missing ${envName} env var.`);

  const looksHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  if (looksHex) {
    const b = Buffer.from(raw, "hex");
    if (b.length !== 32) throw new Error(`${envName} must decode to 32 bytes (hex).`);
    return b;
  }

  try {
    const b = Buffer.from(raw, "base64url");
    if (b.length === 32) return b;
  } catch {}

  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {}

  throw new Error(`${envName} must decode to 32 bytes (AES-256).`);
}

/** dependents format: v1.<iv_b64url>.<tag_b64url>.<ct_b64url> */
function encryptDependentSsn(digits: string) {
  const d = digitsOnly(digits, 9);
  if (d.length !== 9) return "";

  const key = readAes256Key("SSN_ENCRYPTION_KEY");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ct = Buffer.concat([cipher.update(d, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ct.toString("base64url")}`;
}

function decryptDependentSsn(payload: string) {
  const raw = String(payload ?? "");
  if (!raw.startsWith("v1.")) return "";

  const parts = raw.split(".");
  if (parts.length !== 4) return "";

  const key = readAes256Key("SSN_ENCRYPTION_KEY");
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ct = Buffer.from(parts[3], "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

function formatSsn(digits: string) {
  const d = String(digits ?? "").replace(/\D/g, "");
  if (d.length !== 9) return "";
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export async function addDependent(userId: string, formData: FormData) {
  await adminGate();

  const firstName = asString(formData.get("firstName"));
  const middleName = asString(formData.get("middleName"));
  const lastName = asString(formData.get("lastName"));

  const dob = asString(formData.get("dob"));
  const relationship = asString(formData.get("relationship"));
  const monthsInHome = asInt(formData.get("monthsInHome"), 12);

  const appliedButNotReceived = asBool(formData.get("appliedButNotReceived"));
  const isStudent = asBool(formData.get("isStudent"));
  const isDisabled = asBool(formData.get("isDisabled"));

  // optional SSN field (9 digits)
 const ssnRaw = asString(formData.get("ssn")); // may be "123-45-6789"
const ssnDigits = ssnRaw.replace(/\D/g, "").slice(0, 9);

if (ssnRaw && ssnDigits.length !== 9) {
  throw new Error("SSN must be 9 digits (###-##-####).");
}
if (appliedButNotReceived && ssnDigits.length) {
  throw new Error("SSN is marked as pending. Uncheck “Applied but not received” to save SSN.");
}

  if (!firstName || !lastName || !dob || !relationship) {
    throw new Error("Missing required fields (first, last, DOB, relationship).");
  }
  if (monthsInHome < 0 || monthsInHome > 12) {
    throw new Error("Months in home must be between 0 and 12.");
  }


  const canStoreSsn = !appliedButNotReceived && ssnDigits.length === 9;

  await db.insert(dependents).values({
    userId,
    firstName,
    middleName,
    lastName,
    dob,
    relationship,
    monthsInHome,
    appliedButNotReceived,
    isStudent,
    isDisabled,

    // ✅ match your schema (nullable)
    ssnEncrypted: canStoreSsn ? encryptDependentSsn(ssnDigits) : null,
    ssnLast4: canStoreSsn ? ssnDigits.slice(-4) : null,
    ssnSetAt: canStoreSsn ? new Date() : null,

    updatedAt: new Date(),
  } as any);

  revalidatePath(dependentsPath(userId));
}

export async function updateDependent(
  userId: string,
  dependentId: string,
  formData: FormData,
) {
  await adminGate();

  const firstName = asString(formData.get("firstName"));
  const middleName = asString(formData.get("middleName"));
  const lastName = asString(formData.get("lastName"));
  const dob = asString(formData.get("dob"));
  const relationship = asString(formData.get("relationship"));
  const monthsInHome = asInt(formData.get("monthsInHome"), 12);

  const appliedButNotReceived = asBool(formData.get("appliedButNotReceived"));
  const isStudent = asBool(formData.get("isStudent"));
  const isDisabled = asBool(formData.get("isDisabled"));

  const ssnRaw = asString(formData.get("ssn"));
  const ssnDigits = digitsOnly(asString(formData.get("ssn")), 9);

  if (ssnRaw && ssnDigits.length !== 9) {
  throw new Error("SSN must be 9 digits (###-##-####).");
}

  if (!firstName || !lastName || !dob || !relationship) {
    throw new Error("Missing required fields (first, last, DOB, relationship).");
  }
  if (monthsInHome < 0 || monthsInHome > 12) {
    throw new Error("Months in home must be between 0 and 12.");
  }

  const setObj: any = {
    firstName,
    middleName,
    lastName,
    dob,
    relationship,
    monthsInHome,
    appliedButNotReceived,
    isStudent,
    isDisabled,
    updatedAt: new Date(),
  };

  // ✅ If SSN pending, scrub stored SSN
  if (appliedButNotReceived) {
    setObj.ssnEncrypted = null;
    setObj.ssnLast4 = null;
    setObj.ssnSetAt = null;
  } else if (ssnDigits.length === 9) {
    // ✅ If user typed SSN, store it and stamp ssnSetAt
    setObj.ssnEncrypted = encryptDependentSsn(ssnDigits);
    setObj.ssnLast4 = ssnDigits.slice(-4);
    setObj.ssnSetAt = new Date();
  }
  // else: leave SSN columns as-is

  await db
    .update(dependents)
    .set(setObj)
    .where(and(eq(dependents.id, dependentId), eq(dependents.userId, userId)));

  revalidatePath(dependentsPath(userId));
}

export async function deleteDependent(userId: string, dependentId: string) {
  await adminGate();

  await db
    .delete(dependents)
    .where(and(eq(dependents.id, dependentId), eq(dependents.userId, userId)));

  revalidatePath(dependentsPath(userId));
}

export async function listDependents(userId: string) {
  await adminGate();

  const rows = await db
    .select({
      id: dependents.id,
      userId: dependents.userId,
      firstName: dependents.firstName,
      middleName: dependents.middleName,
      lastName: dependents.lastName,
      dob: dependents.dob,
      relationship: dependents.relationship,
      monthsInHome: dependents.monthsInHome,
      isStudent: dependents.isStudent,
      isDisabled: dependents.isDisabled,
      appliedButNotReceived: dependents.appliedButNotReceived,

      ssnEncrypted: dependents.ssnEncrypted,
      ssnLast4: dependents.ssnLast4,
      ssnSetAt: (dependents as any).ssnSetAt,

      createdAt: dependents.createdAt,
      updatedAt: dependents.updatedAt,
    } as any)
    .from(dependents)
    .where(eq(dependents.userId, userId))
    .orderBy(desc(dependents.createdAt));

  return rows.map((r: any) => ({
    ...r,
    dob: r?.dob ? String(r.dob).slice(0, 10) : "",
    hasSsn: Boolean(r?.ssnEncrypted || r?.ssnLast4),
    ssnLast4: r?.ssnLast4 ? String(r.ssnLast4) : null,
    ssnSetAt: r?.ssnSetAt ? String(r.ssnSetAt) : null,
  }));
}

export async function revealDependentSsn(userId: string, dependentId: string) {
  await adminGate();

  const [row] = await db
    .select({
      ssnEncrypted: dependents.ssnEncrypted,
      appliedButNotReceived: dependents.appliedButNotReceived,
      ssnLast4: dependents.ssnLast4,
    } as any)
    .from(dependents)
    .where(and(eq(dependents.id, dependentId), eq(dependents.userId, userId)))
    .limit(1);

  if (!row) throw new Error("Dependent not found");
  if (row.appliedButNotReceived || !row.ssnEncrypted) return { ssn: "" };

  const digits = decryptDependentSsn(String(row.ssnEncrypted));
  return { ssn: formatSsn(digits) };
}
