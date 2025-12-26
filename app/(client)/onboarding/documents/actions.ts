// app/(client)/onboarding/documents/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { users, documents } from "@/drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { uploadToS3, deleteFromS3 } from "@/lib/s3/s3";
import { getServerRole } from "@/lib/auth/roleServer";

// ---------------- helpers ----------------
function clean(v: unknown, max = 255) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}
function normalizeEmail(v: unknown) {
  return clean(v, 255).toLowerCase();
}

async function requireAuth() {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const email = auth?.email ? normalizeEmail(auth.email) : "";
  if (!sub) throw new Error("Unauthorized. Please sign in again.");
  return { sub, email };
}

/** DB helper: get or create user by cognitoSub (email is required on insert) */
async function getOrCreateUserBySub(cognitoSub: string, email?: string) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing) {
    // if we have a better email now, update it
    if (email && email !== existing.email) {
      const [updated] = await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  const finalEmail = email?.trim();
  if (!finalEmail) {
    // because users.email is notNull — don’t create junk rows
    throw new Error("Missing email. Please sign in again.");
  }

  const [created] = await db
    .insert(users)
    .values({
      cognitoSub,
      email: finalEmail,
      onboardingStep: "DOCUMENTS" as any,
      updatedAt: new Date(),
    } as any)
    .returning();

  return created;
}

// ---------------- actions ----------------

/**
 * 1) Upload a single document to S3 + save metadata in DB
 */
export async function uploadDocument(formData: FormData) {
  const { sub: cookieSub, email: cookieEmail } = await requireAuth();

  // optional hidden fields (must match)
  const bodySub = clean(formData.get("cognitoSub"), 200);
  if (bodySub && bodySub !== cookieSub) throw new Error("Forbidden.");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Missing file");

  const user = await getOrCreateUserBySub(cookieSub, cookieEmail);

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
    } as any)
    .returning();

  revalidatePath("/onboarding/documents");

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
 * 2) List all documents for this user
 */
export async function listDocuments(cognitoSubFromClient: string) {
  const { sub: cookieSub, email: cookieEmail } = await requireAuth();

  // enforce match if client sends sub
  const bodySub = clean(cognitoSubFromClient, 200);
  if (bodySub && bodySub !== cookieSub) throw new Error("Forbidden.");

  const user = await getOrCreateUserBySub(cookieSub, cookieEmail);

  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, user.id))
    .orderBy(desc(documents.uploadedAt));

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
 * 3) Delete a document (S3 + DB)
 */
export async function deleteDocument(docId: string, cognitoSubFromClient: string) {
  const { sub: cookieSub, email: cookieEmail } = await requireAuth();

  const bodySub = clean(cognitoSubFromClient, 200);
  if (bodySub && bodySub !== cookieSub) throw new Error("Forbidden.");

  const user = await getOrCreateUserBySub(cookieSub, cookieEmail);

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)))
    .limit(1);

  if (!doc) throw new Error("Document not found.");

  await deleteFromS3(doc.key);

  await db
    .delete(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, user.id)));

  revalidatePath("/onboarding/documents");

  return { ok: true };
}

/**
 * 4) Save documents step → advance onboarding to QUESTIONS
 */
export async function saveDocuments(formData: FormData) {
  const { sub: cookieSub, email: cookieEmail } = await requireAuth();

  const bodySub = clean(formData.get("cognitoSub"), 200);
  if (bodySub && bodySub !== cookieSub) throw new Error("Forbidden.");

  const acknowledged = formData.get("acknowledged") === "on";
  if (!acknowledged) throw new Error("Please confirm that you’ve uploaded your documents.");

  const user = await getOrCreateUserBySub(cookieSub, cookieEmail);

  await db
    .update(users)
    .set({
      onboardingStep: "QUESTIONS" as any,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/documents");
  revalidatePath("/onboarding/questions");

  redirect("/onboarding/questions");
}
