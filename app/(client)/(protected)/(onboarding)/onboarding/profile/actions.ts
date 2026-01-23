//  app/(client)/(protected)/(onboarding)/onboarding/profile/actions.ts
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
  return clean(v, 10).replace(/[^0-9-]/g, "");
}

function normalizeDobYYYYMMDD(v: unknown) {
  const s = clean(v, 10);
  if (!s || s.length !== 10 || s[4] !== "-" || s[7] !== "-") return "";
  return s;
}

/**
 * Accepts BOTH base64url and base64 and returns a 32-byte key buffer (or null).
 */
function decodeKey(keyStr: string): Buffer | null {
  try {
    const a = Buffer.from(keyStr, "base64url");
    if (a.length === 32) return a;
  } catch {}

  try {
    const b = Buffer.from(keyStr, "base64");
    if (b.length === 32) return b;
  } catch {}

  return null;
}

/**
 * Encrypt SSN if SSN_ENCRYPTION_KEY is provided (base64 32 bytes).
 * Stores as: iv.tag.data (base64 segments)
 */
function encryptSSN(ssnDigits: string): string | null {
  const keyStr = process.env.SSN_ENCRYPTION_KEY?.trim();
  if (!keyStr) return null;

  const key = decodeKey(keyStr);
  if (!key) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const enc = Buffer.concat([cipher.update(ssnDigits, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString(
    "base64"
  )}`;
}


export async function saveProfile(formData: FormData) {
  // ✅ Source of truth: cookie tokens (NEVER trust hidden fields)
  const server = await getServerRole();

  const cognitoSub = String((server as any)?.sub ?? (server as any)?.cognitoSub ?? "");
  const email = normalizeEmail((server as any)?.email ?? "");

  if (!cognitoSub) throw new Error("Unauthorized. Please sign in again.");
  if (!email) throw new Error("Missing email. Please sign in again.");

  // --- fields from the form ---
  const firstName = clean(formData.get("firstName"), 60) || null;
  const middleName = clean(formData.get("middleName"), 60) || null;
  const lastName = clean(formData.get("lastName"), 60) || null;
  const suffix = clean(formData.get("suffix"), 10) || null;

  const fullName =
    [firstName, middleName, lastName, suffix].filter(Boolean).join(" ").trim() || null;

  const phone = clean(formData.get("phone"), 30) || null;

  const address1 = clean(formData.get("address1"), 100) || null;
  const address2 = clean(formData.get("address2"), 100) || null;
  const city = clean(formData.get("city"), 80) || null;
  const state = normalizeState(formData.get("state")) || null;
  const zip = normalizeZip(formData.get("zip")) || null;

  const dob = normalizeDobYYYYMMDD(formData.get("dob")) || null;

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
      set: { email, updatedAt: new Date() },
    });

  // ---------- SSN (set once) ----------
   const ssnDigits = digitsOnly(formData.get("ssn"));
  let ssnEncrypted: string | null = null;
  let ssnLast4: string | null = null;
  let ssnSetAt: Date | null = null;

  if (ssnDigits.length === 9) {
    const [existing] = await db
      .select({ ssnEncrypted: users.ssnEncrypted, ssnLast4: users.ssnLast4 })
      .from(users)
      .where(eq(users.cognitoSub, cognitoSub))
      .limit(1);

    const alreadySet = !!(existing?.ssnEncrypted || existing?.ssnLast4);

    if (!alreadySet) {
      const enc = encryptSSN(ssnDigits);

      if (!enc) {
        // ✅ Do NOT crash onboarding if encryption isn't configured
        console.error(
          "[onboarding] SSN_ENCRYPTION_KEY missing/invalid — SSN not saved"
        );
      } else {
        ssnEncrypted = enc;
        ssnLast4 = ssnDigits.slice(-4);
        ssnSetAt = new Date();
      }
    }
  }

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

      ...(ssnEncrypted ? { ssnEncrypted } : {}),
      ...(ssnLast4 ? { ssnLast4 } : {}),
      ...(ssnSetAt ? { ssnSetAt } : {}),

      onboardingStep: "DOCUMENTS" as any,
      updatedAt: new Date(),
    })
    .where(eq(users.cognitoSub, cognitoSub));

  redirect("/onboarding/documents");
}
