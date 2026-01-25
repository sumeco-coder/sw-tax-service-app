// app/(admin)/admin/(protected)/clients/[userId]/dependents/actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { dependents, users } from "@/drizzle/schema";
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

function dependentsPath(userId: string) {
  return `/admin/clients/${userId}/dependents`;
}

function requireAdmin(auth: any) {
  const role = String(auth?.role ?? "");
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

  if (!firstName || !lastName || !dob || !relationship) {
    throw new Error("Missing required fields (first, last, DOB, relationship).");
  }

  if (monthsInHome < 0 || monthsInHome > 12) {
    throw new Error("Months in home must be between 0 and 12.");
  }

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
    updatedAt: new Date(),
  } as any);

  revalidatePath(dependentsPath(userId));
}

export async function updateDependent(userId: string, dependentId: string, formData: FormData) {
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

  if (!firstName || !lastName || !dob || !relationship) {
    throw new Error("Missing required fields (first, last, DOB, relationship).");
  }

  if (monthsInHome < 0 || monthsInHome > 12) {
    throw new Error("Months in home must be between 0 and 12.");
  }

  await db
    .update(dependents)
    .set({
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
    } as any)
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
      ssnLast4: (dependents as any).ssnLast4,
      createdAt: dependents.createdAt,
    } as any)
    .from(dependents)
    .where(eq(dependents.userId, userId))
    .orderBy(desc(dependents.createdAt));

  return rows.map((r: any) => ({
    ...r,
    dob: r?.dob ? String(r.dob).slice(0, 10) : "",
    hasSsn: Boolean(r?.ssnEncrypted),
    ssnLast4: r?.ssnLast4 ? String(r.ssnLast4) : null,
  }));
}

export async function revealDependentSsn(userId: string, dependentId: string) {
  await adminGate();

  const [row] = await db
    .select({
      ssnEncrypted: dependents.ssnEncrypted,
      appliedButNotReceived: dependents.appliedButNotReceived,
    } as any)
    .from(dependents)
    .where(and(eq(dependents.id, dependentId), eq(dependents.userId, userId)))
    .limit(1);

  if (!row) throw new Error("Dependent not found");
  if (row.appliedButNotReceived || !row.ssnEncrypted) return { ssn: "" };

  const digits = decryptDependentSsn(String(row.ssnEncrypted));
  return { ssn: formatSsn(digits) };
}
