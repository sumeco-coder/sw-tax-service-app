// app/(client)/(protected)/(app)/files/actions.ts
"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq, or } from "drizzle-orm";

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

const STAFF_ROLES = new Set([
  "admin",
  "superadmin",
  "lms-admin",
  "lms-preparer",
]);

// ✅ FILES = taxpayer uploads bucket prefix
const UPLOADS_PREFIX = "uploads";

/* ------------------------- helpers ------------------------- */

async function requireAuth() {
  const auth = await getServerRole();
  if (!auth?.sub) redirect("/sign-in");

  const role = String(auth.role ?? "").toLowerCase();
  const sub = String(auth.sub);

  // ✅ resolve DB user id (UUID) from Cognito sub (supports legacy folder keys)
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  return {
    sub,
    dbUserId: u ? String(u.id) : null,
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
// ✅ Canonical folder key = Cognito `sub`, but we also support legacy `users.id` prefixes for listing/downloading.
function userPrefix(userFolderId: string) {
  const clean = String(userFolderId ?? "").trim();
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
  return key.split("/").pop() || key;
}

async function assertCanAccessTarget(targetUserIdOrSub: string) {
  const auth = await requireAuth();
  const target = String(targetUserIdOrSub ?? "").trim();
  if (!target) throw new Error("Missing target user id.");

  // ✅ owner check is based on Cognito sub (target should be sub for "owner" access)
  const isOwner =
    auth.sub === target || (!!auth.dbUserId && auth.dbUserId === target);

  if (!auth.isStaff && !isOwner) throw new Error("Forbidden.");

  return { ...auth, target };
}

function assertKeyUnderPrefix(key: string, prefix: string) {
  const k = String(key ?? "").trim();
  if (!k) throw new Error("Missing key.");
  if (!k.startsWith(prefix)) throw new Error("Forbidden.");
  return k;
}

function assertKeyUnderAnyPrefix(key: string, prefixes: string[]) {
  const k = String(key ?? "").trim();
  if (!k) throw new Error("Missing key.");
  const ok = prefixes.some((p) => k.startsWith(p));
  if (!ok) throw new Error("Forbidden.");
  return k;
}

async function headOrThrow(s3: S3Client, bucket: string, key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (e: any) {
    const status = e?.$metadata?.httpStatusCode;
    const name = e?.name;

    if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
      throw new Error(
        "File is missing in storage. It may not have uploaded correctly.",
      );
    }

    throw e;
  }
}

async function listPrefix(prefix: string): Promise<ListItem[]> {
  const { s3, bucket } = getS3();

  const out = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }),
  );

  const items =
    out.Contents?.map((o) => ({
      key: String(o.Key ?? ""),
      name: objectNameFromKey(String(o.Key ?? "")),
      size: Number(o.Size ?? 0),
      lastModified: o.LastModified
        ? new Date(o.LastModified).toISOString()
        : null,
    })) ?? [];

  return items.filter((x) => x.key);
}



async function resolveFolderIdsForStaff(target: string): Promise<string[]> {
  const t = String(target ?? "").trim();
  if (!t) return [];

  // target may be DB users.id OR users.cognitoSub
  const [u] = await db
    .select({ id: users.id, cognitoSub: users.cognitoSub })
    .from(users)
    .where(or(eq(users.id, t), eq(users.cognitoSub, t)))
    .limit(1);

  if (!u) return [t];

  const ids = [String(u.cognitoSub ?? "").trim(), String(u.id ?? "").trim()].filter(Boolean);

  // return both, unique, stable
  return Array.from(new Set(ids));
}


/* ------------------------- exports (SELF) ------------------------- */

// ✅ taxpayer list their own uploads (supports both sub + legacy db userId folders)
export async function listMyDocuments(): Promise<ListItem[]> {
  const auth = await requireAuth();

  const prefixes = [
    userPrefix(auth.sub), // canonical
    auth.dbUserId ? userPrefix(auth.dbUserId) : null, // legacy fallback
  ].filter(Boolean) as string[];

  const all = (await Promise.all(prefixes.map(listPrefix))).flat();

  // de-dupe by key
  const map = new Map<string, ListItem>();
  for (const item of all) map.set(item.key, item);

  const items = Array.from(map.values());
  items.sort((a, b) =>
    (b.lastModified ?? "").localeCompare(a.lastModified ?? ""),
  );
  return items;
}

// ✅ taxpayer create upload url (for their own uploads) — always writes to canonical sub folder
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

  // If someone uploaded into legacy folder manually, we still allow finalize only if key is under
  // either canonical or legacy prefix.
  const allowedPrefixes = [
    userPrefix(auth.sub),
    auth.dbUserId ? userPrefix(auth.dbUserId) : null,
  ].filter(Boolean) as string[];

  const { s3, bucket } = getS3();
  const k = assertKeyUnderAnyPrefix(input.key, allowedPrefixes);

  await headOrThrow(s3, bucket, k);
  return { ok: true };
}

// ✅ taxpayer create download url (for their own uploads) — allows canonical + legacy folders
export async function createMyDownloadUrl(
  key: string,
): Promise<{ url: string }> {
  const auth = await requireAuth();

  const allowedPrefixes = [
    userPrefix(auth.sub),
    auth.dbUserId ? userPrefix(auth.dbUserId) : null,
  ].filter(Boolean) as string[];

  const { s3, bucket } = getS3();

  const k = assertKeyUnderAnyPrefix(key, allowedPrefixes);

  // ✅ Verify object exists before signing
  await headOrThrow(s3, bucket, k);

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: k }),
    { expiresIn: 60 * 5 },
  );

  return { url };
}

/* ------------------------- exports (TARGET) ------------------------- */

// ✅ staff OR owner list uploads for a target user folder (expects folder id, usually cognito sub)
export async function listClientDocuments(
  targetUserIdOrSub: string
): Promise<ListItem[]> {
  const auth = await requireAuth();
  const target = String(targetUserIdOrSub ?? "").trim();
  if (!target) throw new Error("Missing target user id.");

  let folderIds: string[] = [];

  if (auth.isStaff) {
    folderIds = await resolveFolderIdsForStaff(target);
  } else {
    const isOwner = auth.sub === target || (!!auth.dbUserId && auth.dbUserId === target);
    if (!isOwner) throw new Error("Forbidden.");
    folderIds = [auth.sub, auth.dbUserId].filter(Boolean) as string[];
  }

  const prefixes = folderIds.map(userPrefix);
  const all = (await Promise.all(prefixes.map(listPrefix))).flat();

  // de-dupe by key
  const map = new Map<string, ListItem>();
  for (const item of all) map.set(item.key, item);

  const items = Array.from(map.values());
  items.sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""));
  return items;
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
    { expiresIn: 60 * 5 },
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
  const auth = await requireAuth();
  const target = String(input.targetUserIdOrSub ?? "").trim();
  if (!target) throw new Error("Missing target user id.");

  let folderIds: string[] = [];

  if (auth.isStaff) {
    folderIds = await resolveFolderIdsForStaff(target);
  } else {
    const isOwner = auth.sub === target || (!!auth.dbUserId && auth.dbUserId === target);
    if (!isOwner) throw new Error("Forbidden.");
    folderIds = [auth.sub, auth.dbUserId].filter(Boolean) as string[];
  }

  const allowedPrefixes = folderIds.map(userPrefix);

  const { s3, bucket } = getS3();

  const k = assertKeyUnderAnyPrefix(input.key, allowedPrefixes);

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
    }),
  );

  return { ok: true };
}
