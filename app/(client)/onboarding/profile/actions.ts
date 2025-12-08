"use server";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function saveProfile(formData: FormData) {
  const cognitoSub = (formData.get("cognitoSub") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();

  if (!cognitoSub || !email) {
    throw new Error("Missing user identity for onboarding.");
  }

  // --- New fields from the profile form ---
  const firstName =
    (formData.get("firstName") as string | null)?.trim() || null;
  const lastName = (formData.get("lastName") as string | null)?.trim() || null;
  const suffix = (formData.get("suffix") as string | null)?.trim() || null;

  // Full display name (e.g. "John Doe Jr")
  const fullName =
    [firstName, lastName, suffix].filter(Boolean).join(" ") || null;

  // 🔹 DOB (YYYY-MM-DD from <input type="date">)
  const dobStr = (formData.get("dob") as string | null)?.trim() || null;
  const dob = dobStr || null;

  // 🔹 SSN (for now, store as-is in ssnEncrypted – later you’ll encrypt it)
  const ssn = (formData.get("ssn") as string | null)?.trim() || null;

  // ⚠️ IMPORTANT:
  // For real production, you should encrypt SSN with KMS or a proper crypto library.
  // For now we just store it in `ssnEncrypted` if provided.
  const ssnEncrypted = ssn || null; // TODO: replace with real encryption in production

  // 🔹 Contact + address
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const address1 = (formData.get("address1") as string | null)?.trim() || null;
  const address2 = (formData.get("address2") as string | null)?.trim() || null;
  const city = (formData.get("city") as string | null)?.trim() || null;
  const state = (formData.get("state") as string | null)?.trim() || null;
  const zip = (formData.get("zip") as string | null)?.trim() || null;

  // 1) See if user row already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing.length === 0) {
    // 2a) Create user row
    await db.insert(users).values({
      cognitoSub,
      email,
      firstName,
      lastName,
      name: fullName,
      phone,
      address1,
      address2,
      city,
      state,
      zip,
      dob,
      ssnEncrypted,
      onboardingStep: "DOCUMENTS",
    } as any);
  } else {
    // 2b) Update existing user row
    await db
      .update(users)
      .set({
        firstName,
        lastName,
        name: fullName,
        phone,
        address1,
        address2,
        city,
        state,
        zip,
        dob,
        ssnEncrypted,
        onboardingStep: "DOCUMENTS",
        updatedAt: new Date(),
      })
      .where(eq(users.cognitoSub, cognitoSub));
  }

  // 3) Move them to the next step
  redirect("/onboarding/documents");
}
