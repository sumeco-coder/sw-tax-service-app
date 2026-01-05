// app/(client)/(protected)/(app)/documents/actions.ts
"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { users, documents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

import { S3Client, GetObjectCommand, PutObjectCommand,  DeleteObjectCommand, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/* ------------------------- helpers ------------------------- */

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function sanitizeFileName(name: string) {
  const n = String(name ?? "file").trim() || "file";
  // prevent folders / weird chars
  return n.replace(/[\/\\]/g, "_").replace(/[^\w.\-()\s]/g, "_");
}

function getS3Config() {
  const bucket =
    process.env.DOCUMENTS_BUCKET ||
    process.env.S3_BUCKET ||
    process.env.AWS_S3_BUCKET ||
    "";

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "";

  if (!bucket || !region) {
    throw new Error("Server S3 config missing (bucket/region).");
  }

  return { bucket, region };
}

async function requireAuthUser() {
  const me = await getServerRole();
  if (!me?.sub) redirect("/sign-in");

  const role = String(me.role ?? "").toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";

  const [userRow] = await db
    .select({ id: users.id, cognitoSub: users.cognitoSub })
    .from(users)
    .where(eq(users.cognitoSub, String(me.sub)))
    .limit(1);

  // ✅ If they’re authenticated but not in DB, send them to onboarding to create row
  if (!userRow) redirect("/onboarding");

  return { me, role, isAdmin, userRow };
}

/**
 * Accepts either:
 *  - DB user UUID (users.id)
 *  - Cognito sub (users.cognitoSub)
 * Returns the DB UUID.
 */
async function resolveUserId(idOrSub: string) {
  const raw = String(idOrSub ?? "").trim();
  if (!raw) throw new Error("Missing user id.");

  if (isUuid(raw)) return raw;

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cognitoSub, raw))
    .limit(1);

  if (!row) throw new Error("User not found.");
  return String(row.id);
}

async function assertCanAccess(idOrSub: string) {
  const { isAdmin, userRow } = await requireAuthUser();
  const targetUserId = await resolveUserId(idOrSub);

  const isOwner = String(userRow.id) === String(targetUserId);

  if (!isAdmin && !isOwner) {
    throw new Error("Forbidden.");
  }

  return { isAdmin, isOwner, targetUserId, viewerUserId: String(userRow.id) };
}

/* ------------------------- exports ------------------------- */

/**
 * ✅ Used by the logged-in taxpayer (no params).
 */
export async function listMyDocuments() {
  const { userRow } = await requireAuthUser();
  return listClientDocuments(String(userRow.id));
}

/**
 * ✅ Admin OR owner can list documents for a user.
 * Accepts UUID or cognitoSub safely.
 */
export async function listClientDocuments(clientIdOrSub: string) {
  const { targetUserId } = await assertCanAccess(clientIdOrSub);

  const rows = await db
    .select({
      key: documents.key,
      name: documents.displayName,
      uploadedAt: documents.uploadedAt,
    })
    .from(documents)
    .where(eq(documents.userId, targetUserId))
    .orderBy(desc(documents.uploadedAt));

  return (rows ?? []).map((r) => ({
    key: String(r.key),
    name: String(r.name ?? r.key),
    size: 0,
    lastModified: r.uploadedAt ? new Date(r.uploadedAt as any).toISOString() : null,
  }));
}

/**
 * ✅ Create a presigned PUT url for upload.
 * - If input.targetUserId provided: admin OR owner allowed (UUID or sub)
 * - If not provided: uses current logged-in user's DB id
 *
 * Inserts a row into `documents` so it appears in lists.
 */
export async function createUploadUrl(input: {
  fileName: string;
  contentType?: string;
  targetUserId?: string; // UUID or cognitoSub
}) {
  const { userRow } = await requireAuthUser();
  const { bucket, region } = getS3Config();

  const fileName = sanitizeFileName(input.fileName);
  if (!fileName) throw new Error("Missing file name.");

  const contentType = String(input.contentType ?? "application/octet-stream");

  // Determine who the upload is for
  let targetUserId = String(userRow.id);

  if (input.targetUserId) {
    const access = await assertCanAccess(String(input.targetUserId));
    targetUserId = String(access.targetUserId);
  }

  // Store under the user's folder
  const key = `${targetUserId}/${crypto.randomUUID()}-${fileName}`;

  const s3 = new S3Client({ region });

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 5 }
  );

  // ✅ Insert DB row so listClientDocuments() shows it
  await db.insert(documents).values({
    userId: targetUserId,
    key,
    displayName: fileName,
    uploadedAt: new Date(),
  });

  return { key, url };
}

/**
 * ✅ Logged-in user download (owner) OR admin
 */
export async function createMyDownloadUrl(key: string) {
  const { userRow } = await requireAuthUser();
  return createClientDownloadUrl(String(userRow.id), key);
}

/**
 * ✅ Admin OR owner download.
 * Verifies the document belongs to target user before signing.
 */
export async function createClientDownloadUrl(clientIdOrSub: string, key: string) {
  const { isAdmin, targetUserId, viewerUserId } = await assertCanAccess(clientIdOrSub);
  const { bucket, region } = getS3Config();

  const k = String(key ?? "").trim();
  if (!k) throw new Error("Missing key.");

  // ✅ Ensure this key belongs to that user (prevents guessing keys)
  const [doc] = await db
    .select({
      key: documents.key,
      ownerId: documents.userId,
    })
    .from(documents)
    .where(eq(documents.key, k))
    .limit(1);

  if (!doc) throw new Error("Document not found.");

  if (String(doc.ownerId) !== String(targetUserId)) {
    throw new Error("Forbidden.");
  }

  // If not admin, only allow downloading own docs
  if (!isAdmin && String(targetUserId) !== String(viewerUserId)) {
    throw new Error("Forbidden.");
  }

  const s3 = new S3Client({ region });

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: k }),
    { expiresIn: 60 * 5 }
  );

  return { url };
}


export async function deleteDocument(input: { targetUserId: string; key: string }) {
  const { isAdmin, targetUserId, viewerUserId } = await assertCanAccess(String(input.targetUserId));
  const { bucket, region } = getS3Config();

  const k = String(input.key ?? "").trim();
  if (!k) throw new Error("Missing key.");

  const [doc] = await db
    .select({ key: documents.key, ownerId: documents.userId })
    .from(documents)
    .where(eq(documents.key, k))
    .limit(1);

  if (!doc) throw new Error("Document not found.");
  if (String(doc.ownerId) !== String(targetUserId)) throw new Error("Forbidden.");
  if (!isAdmin && String(targetUserId) !== String(viewerUserId)) throw new Error("Forbidden.");

  const s3 = new S3Client({ region });

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: k }));
  } catch {}

  await db.delete(documents).where(and(eq(documents.key, k), eq(documents.userId, targetUserId)));

  return { ok: true };
}
