"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

// --- helpers ---
function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function clean(v: unknown, max = 255) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

function digitsOnly(v: unknown) {
  return String(v ?? "").replace(/\D/g, "");
}

function normalizeState(v: unknown) {
  return clean(v, 2).toUpperCase();
}

function normalizeZip(v: unknown) {
  // keep 12345 or 12345-6789
  return clean(v, 10).replace(/[^0-9-]/g, "");
}

function normalizeDobYYYYMMDD(v: unknown) {
  // input type="date" sends YYYY-MM-DD already
  const s = clean(v, 10);
  // quick sanity: 10 chars with 2 dashes
  if (!s || s.length !== 10 || s[4] !== "-" || s[7] !== "-") return "";
  return s;
}

/**
 * Encrypt SSN if SSN_ENCRYPTION_KEY is provided (base64 32 bytes).
 * Stores as: iv.tag.data (base64 segments)
 */
function encryptSSN(ssnDigits: string): string | null {
  const keyB64 = process.env.SSN_ENCRYPTION_KEY;
  if (!keyB64) return null;

  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const enc = Buffer.concat([cipher.update(ssnDigits, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString(
    "base64"
  )}`;
}

export async function saveProfile(formData: FormData) {
  // ✅ Source of truth: cookie tokens
  const server = await getServerRole();
  const cookieSub = server?.sub ? String(server.sub) : "";
  const cookieEmail = server?.email ? normalizeEmail(server.email) : "";

  if (!cookieSub) {
    throw new Error("Unauthorized. Please sign in again.");
  }

  // Keep hidden fields as fallback, but do NOT trust them if cookies exist
  const bodySub = clean(formData.get("cognitoSub"), 200);
  const bodyEmail = normalizeEmail(formData.get("email"));

  if (bodySub && bodySub !== cookieSub) {
    throw new Error("Forbidden.");
  }

  const cognitoSub = cookieSub;
  const email = cookieEmail || bodyEmail;

  if (!email) {
    throw new Error("Missing email. Please sign in again.");
  }

  // --- fields from the form ---
  const firstName = clean(formData.get("firstName"), 60) || null;
  const middleName = clean(formData.get("middleName"), 60) || null; // ✅ ADDED
  const lastName = clean(formData.get("lastName"), 60) || null;
  const suffix = clean(formData.get("suffix"), 10) || null;

  // ✅ Full display name includes middle name when present
  const fullName =
    [firstName, middleName, lastName, suffix].filter(Boolean).join(" ").trim() ||
    null;

  const phone = clean(formData.get("phone"), 30) || null;

  const address1 = clean(formData.get("address1"), 100) || null;
  const address2 = clean(formData.get("address2"), 100) || null;
  const city = clean(formData.get("city"), 80) || null;
  const state = normalizeState(formData.get("state")) || null;
  const zip = normalizeZip(formData.get("zip")) || null;

  // DOB stored as YYYY-MM-DD (works great with Drizzle pg date)
  const dob = normalizeDobYYYYMMDD(formData.get("dob")) || null;

  // SSN: store ONLY encrypted (or ignore if no encryption key)
  const ssnDigits = digitsOnly(formData.get("ssn"));
  const ssnEncrypted = ssnDigits.length === 9 ? encryptSSN(ssnDigits) : null;

  // ✅ Ensure user exists (upsert shell)
  await db
    .insert(users)
    .values({
      cognitoSub,
      email,
      onboardingStep: "PROFILE" as any,
    })
    .onConflictDoUpdate({
      target: users.cognitoSub,
      set: {
        email,
        updatedAt: new Date(),
      },
    });

  // ✅ Update profile fields + advance onboarding
  await db
    .update(users)
    .set({
      email,
      firstName,
      middleName, 
      lastName,
      name: fullName,
      phone,
      address1,
      address2,
      city,
      state,
      zip,
      dob,

      // store encrypted SSN only if we successfully encrypted
      ...(ssnEncrypted ? { ssnEncrypted } : {}),

      onboardingStep: "DOCUMENTS" as any,
      updatedAt: new Date(),
    })
    .where(eq(users.cognitoSub, cognitoSub));

  redirect("/onboarding/documents");
}
