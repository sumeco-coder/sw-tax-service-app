// app/(client)/onboarding/documents/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { users, documents } from "@/drizzle/schema"; // 👈 make sure documents exists
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { uploadToS3, deleteFromS3 } from "@/lib/s3/s3"; // 👈 keep your path

// Helper: get or create user by cognitoSub (and optional email)
async function getOrCreateUserByCognitoSub(cognitoSub: string, email?: string) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // If no user yet, create a minimal one
  const [created] = await db
    .insert(users)
    .values({
      cognitoSub,
      email: email || "",
      onboardingStep: "DOCUMENTS", // or "PROFILE" if you prefer
    })
    .returning();

  return created;
}

/**
 * 1️⃣ Upload a single document to S3 + save metadata in DB
 */
export async function uploadDocument(formData: FormData) {
  const file = formData.get("file") as File | null;
  const cognitoSub = (formData.get("cognitoSub") as string | null)?.trim();
  const emailRaw = (formData.get("email") as string | null)?.trim().toLowerCase();

  if (!file) {
    throw new Error("Missing file");
  }
  if (!cognitoSub) {
    throw new Error("Missing user identity (cognitoSub).");
  }

  const email = emailRaw || undefined;
  const user = await getOrCreateUserByCognitoSub(cognitoSub, email);

  // Build safe S3 key: users/{userId}/documents/...
  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const key = `users/${user.id}/documents/${Date.now()}-${safeName}`;

  const { url, key: storedKey } = await uploadToS3(file, key);

  const [doc] = await db
    .insert(documents)
    .values({
      userId: user.id,
      key: storedKey,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    })
    .returning();

  // Return what the client needs to render immediately
  return {
    id: doc.id,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    size: doc.size,
    key: doc.key,
    url,
    uploadedAt: doc.uploadedAt,
  };
}

/**
 * 2️⃣ List all documents for this user (by cognitoSub)
 */
export async function listDocuments(cognitoSub: string) {
  const user = await getOrCreateUserByCognitoSub(cognitoSub);

  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, user.id))
    .orderBy(documents.uploadedAt);

  // If bucket is private, you'll later swap to presigned URLs.
  return rows.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    mimeType: d.mimeType,
    size: d.size,
    key: d.key,
    uploadedAt: d.uploadedAt,
  }));
}

/**
 * 3️⃣ Delete a document (S3 + DB)
 */
export async function deleteDocument(docId: string, cognitoSub: string) {
  const user = await getOrCreateUserByCognitoSub(cognitoSub);

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)))
    .limit(1);

  if (!doc) {
    throw new Error("Document not found.");
  }

  // Remove from S3
  await deleteFromS3(doc.key);

  // Remove from DB
  await db
    .delete(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)));

  return { ok: true };
}

/**
 * 4️⃣ Save documents step → advance onboarding to QUESTIONS
 */
export async function saveDocuments(formData: FormData) {
  const cognitoSub = (formData.get("cognitoSub") as string | null)?.trim();
  const emailRaw = (formData.get("email") as string | null)?.trim().toLowerCase();
  const acknowledged = formData.get("acknowledged") === "on";

  if (!cognitoSub) {
    console.error("saveDocuments: missing cognitoSub", {
      cognitoSub,
      emailRaw,
    });
    throw new Error("Missing user identity for onboarding documents.");
  }

  const email = emailRaw ? emailRaw.toLowerCase() : undefined;

  if (!acknowledged) {
    throw new Error("Please confirm that you’ve uploaded your documents.");
  }

  // Use the same helper so logic stays consistent
  const user = await getOrCreateUserByCognitoSub(cognitoSub, email);

  await db
    .update(users)
    .set({
      onboardingStep: "QUESTIONS", // ✅ your next step
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  redirect("/onboarding/questions");
}
