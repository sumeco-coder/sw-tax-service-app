// app/(client)/(protected)/(app)/files/actions.ts
"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type ListItem = {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
};

const STAFF_ROLES = new Set(["admin", "superadmin", "lms-admin", "lms-preparer"]);

// ✅ FILES = taxpayer uploads bucket prefix
const UPLOADS_PREFIX = "uploads";

/* ------------------------- helpers ------------------------- */

async function requireAuth() {
  const auth = await getServerRole();
  if (!auth?.sub) redirect("/sign-in");

  const role = String(auth.role ?? "").toLowerCase();
  return {
    sub: String(auth.sub),
    role,
    isStaff: STAFF_ROLES.has(role),
  };
}

function getS3() {
  const bucket = process.env.FILES_BUCKET || "";
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "";

  if (!bucket || !region) {
    throw new Error("Server S3 config missing (FILES_BUCKET/AWS_REGION).");
  }

  return { s3: new S3Client({ region }), bucket };
}


// NOTE: In this Files module, `targetUserIdOrSub` is treated as the user folder id.
// ✅ Your app has been using Cognito `sub` as the folder key (recommended).
function userPrefix(userSub: string) {
  const clean = String(userSub ?? "").trim();
  if (!clean) throw new Error("Missing user id.");
  return `${UPLOADS_PREFIX}/${clean}/`;
}

function safeFileName(name: string) {
  return String(name ?? "")
    .trim()
    .replace(/[\/\\]+/g, "_")
    .replace(/\s+/g, " ");
}

function objectNameFromKey(key: string) {
  const base = key.split("/").pop() || key;
  return base;
}

async function assertCanAccessTarget(targetUserIdOrSub: string) {
  const auth = await requireAuth();
  const target = String(targetUserIdOrSub ?? "").trim();
  if (!target) throw new Error("Missing target user id.");

  const isOwner = auth.sub === target;
  if (!auth.isStaff && !isOwner) throw new Error("Forbidden.");

  return { ...auth, target };
}

function assertKeyUnderPrefix(key: string, prefix: string) {
  const k = String(key ?? "").trim();
  if (!k) throw new Error("Missing key.");
  if (!k.startsWith(prefix)) throw new Error("Forbidden.");
  return k;
}

async function headOrThrow(s3: S3Client, bucket: string, key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (e: any) {
    const status = e?.$metadata?.httpStatusCode;
    const name = e?.name;

    if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
      throw new Error("File is missing in storage. It may not have uploaded correctly.");
    }

    throw e;
  }
}

/* ------------------------- exports (SELF) ------------------------- */

// ✅ taxpayer list their own uploads
export async function listMyDocuments(): Promise<ListItem[]> {
  const auth = await requireAuth();
  return listClientDocuments(auth.sub);
}

// ✅ taxpayer create upload url (for their own uploads)
export async function createMyUploadUrl(input: {
  fileName: string;
  contentType: string;
}): Promise<{ key: string; url: string }> {
  const auth = await requireAuth();
  return createUploadUrl({
    targetUserIdOrSub: auth.sub,
    fileName: input.fileName,
    contentType: input.contentType,
  });
}

// ✅ taxpayer finalize their own upload (verify exists after PUT)
export async function finalizeMyUpload(input: {
  key: string;
  fileName?: string;
}): Promise<{ ok: true }> {
  const auth = await requireAuth();
  await finalizeUpload({
    targetUserIdOrSub: auth.sub,
    key: input.key,
    fileName: input.fileName,
  });
  return { ok: true };
}

// ✅ taxpayer create download url (for their own uploads)
export async function createMyDownloadUrl(key: string): Promise<{ url: string }> {
  const auth = await requireAuth();
  return createDownloadUrl({
    targetUserIdOrSub: auth.sub,
    key,
  });
}

/* ------------------------- exports (TARGET) ------------------------- */

// ✅ staff OR owner list uploads for a target user folder (cognito sub)
export async function listClientDocuments(
  targetUserIdOrSub: string
): Promise<ListItem[]> {
  const { target } = await assertCanAccessTarget(targetUserIdOrSub);
  const prefix = userPrefix(target);

  const { s3, bucket } = getS3();

  const out = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    })
  );

  const items =
    out.Contents?.map((o) => ({
      key: String(o.Key ?? ""),
      name: objectNameFromKey(String(o.Key ?? "")),
      size: Number(o.Size ?? 0),
      lastModified: o.LastModified ? new Date(o.LastModified).toISOString() : null,
    })) ?? [];

  // newest first
  items.sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""));
  return items.filter((x) => x.key); // remove empties
}

// ✅ staff OR owner create upload url for a target user folder
export async function createUploadUrl(input: {
  targetUserIdOrSub: string;
  fileName: string;
  contentType: string;
}): Promise<{ key: string; url: string }> {
  const { target } = await assertCanAccessTarget(input.targetUserIdOrSub);
  const prefix = userPrefix(target);

  const { s3, bucket } = getS3();

  const fileName = safeFileName(input.fileName);
  if (!fileName) throw new Error("Missing fileName.");

  const contentType =
    String(input.contentType ?? "").trim() || "application/octet-stream";

  const key = `${prefix}${crypto.randomUUID()}-${fileName}`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 5 }
  );

  return { key, url };
}

// ✅ staff OR owner finalize upload (verify exists after PUT)
export async function finalizeUpload(input: {
  targetUserIdOrSub: string;
  key: string;
  fileName?: string;
}): Promise<{ ok: true }> {
  const { target } = await assertCanAccessTarget(input.targetUserIdOrSub);
  const prefix = userPrefix(target);

  const { s3, bucket } = getS3();

  const k = assertKeyUnderPrefix(input.key, prefix);

  // ✅ verify object exists in S3 after PUT
  await headOrThrow(s3, bucket, k);

  return { ok: true };
}

// ✅ staff OR owner create download url for a key under that user folder
export async function createDownloadUrl(input: {
  targetUserIdOrSub: string;
  key: string;
}): Promise<{ url: string }> {
  const { target } = await assertCanAccessTarget(input.targetUserIdOrSub);
  const prefix = userPrefix(target);

  const { s3, bucket } = getS3();

  const k = assertKeyUnderPrefix(input.key, prefix);

  // ✅ Verify object exists before signing
  await headOrThrow(s3, bucket, k);

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: k }),
    { expiresIn: 60 * 5 }
  );

  return { url };
}

// 🚫 delete uploads = staff-only (optional)
export async function deleteDocument(input: {
  targetUserIdOrSub: string;
  key: string;
}) {
  const auth = await requireAuth();
  if (!auth.isStaff) throw new Error("Forbidden.");

  const target = String(input.targetUserIdOrSub ?? "").trim();
  const prefix = userPrefix(target);
  const k = assertKeyUnderPrefix(input.key, prefix);

  const { s3, bucket } = getS3();

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: k,
    })
  );

  return { ok: true };
}
