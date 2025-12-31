"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

const REGION = process.env.AWS_REGION || "us-west-1";
const BUCKET = process.env.S3_BUCKET_NAME!;
;

const s3 = new S3Client({ region: REGION });

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
}

function keyPrefix(userId: string) {
  return `clients/${userId}/documents/`;
}

function makeKey(userId: string, fileName: string) {
  const safe = sanitizeFileName(fileName);
  return `${keyPrefix(userId)}${crypto.randomUUID()}-${safe}`;
}

async function requireAuthedUser() {
  const auth = await getServerRole();
  if (!auth) return redirect("/sign-in");

  const sub = String(auth.sub ?? "");
  if (!sub) return redirect("/sign-in");

  const [me] = await db
    .select({ id: users.id, onboardingStep: users.onboardingStep })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!me) return redirect("/onboarding");

  return { auth, me };
}

function assertCanAccess(authRole: string, meId: string, targetUserId: string) {
  const isAdmin = authRole === "admin" || authRole === "lms-admin" || authRole === "lms-preparer";
  const isOwner = meId === targetUserId;

  if (!isAdmin && !isOwner) {
    throw new Error("Forbidden.");
  }
}

export async function listClientDocuments(targetUserId: string) {
  const { auth, me } = await requireAuthedUser();
  assertCanAccess(auth.role, String(me.id), targetUserId);

  const out = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: keyPrefix(targetUserId),
    })
  );

  const items =
    out.Contents?.filter(Boolean).map((o) => ({
      key: o.Key!,
      size: Number(o.Size ?? 0),
      lastModified: o.LastModified ? o.LastModified.toISOString() : null,
      name: o.Key!.split("/").pop() ?? o.Key!,
    })) ?? [];

  return items;
}

export async function createUploadUrl(input: {
  targetUserId: string;
  fileName: string;
  contentType: string;
}) {
  const { auth, me } = await requireAuthedUser();
  assertCanAccess(auth.role, String(me.id), input.targetUserId);

  const key = makeKey(input.targetUserId, input.fileName);

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn: 60 } // 60s
  );

  return { key, url };
}

export async function createDownloadUrl(input: { targetUserId: string; key: string }) {
  const { auth, me } = await requireAuthedUser();
  assertCanAccess(auth.role, String(me.id), input.targetUserId);

  // safety: only allow download within that user’s prefix
  if (!input.key.startsWith(keyPrefix(input.targetUserId))) {
    throw new Error("Invalid key.");
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: input.key,
    }),
    { expiresIn: 300 } // 5 min
  );

  return { url };
}

export async function deleteDocument(input: { targetUserId: string; key: string }) {
  const { auth, me } = await requireAuthedUser();
  assertCanAccess(auth.role, String(me.id), input.targetUserId);

  // optional: only admins can delete
  // if (auth.role !== "admin") throw new Error("Forbidden.");

  if (!input.key.startsWith(keyPrefix(input.targetUserId))) {
    throw new Error("Invalid key.");
  }

  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: input.key }));

  revalidatePath("/documents");
  revalidatePath("/admin");
}
