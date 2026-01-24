"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { desc, eq, and } from "drizzle-orm"; // ✅ FIXED: removed `and`
import { db } from "@/drizzle/db";
import { users, documents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"; // ✅ FIXED: removed DeleteObjectCommand
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/* -------------------------------------------------------------------------- */
/* Types */
/* -------------------------------------------------------------------------- */

type ListItem = {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
};

type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "NO_USER_ROW"
        | "CONFIG_MISSING"
        | "FORBIDDEN"
        | "ERROR";
      message?: string;
    };

const NEXT_PATH = "/onboarding/documents";

/* -------------------------------------------------------------------------- */
/* S3 config */
/* -------------------------------------------------------------------------- */

function getS3Config() {
  const bucket =
    process.env.DOCUMENTS_BUCKET ||
    process.env.FILES_BUCKET ||
    process.env.S3_BUCKET_NAME ||
    process.env.S3_BUCKET ||
    process.env.AWS_S3_BUCKET ||
    "";

  const region =
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.S3_REGION ||
    "";

  if (!bucket || !region) {
    console.error("[getS3Config] CONFIG_MISSING", {
      bucketPresent: !!bucket,
      regionPresent: !!region,
    });
    return null;
  }

  return { bucket, region };
}

/* -------------------------------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------------------------------- */

function sanitizeFileName(name: string) {
  return String(name ?? "file")
    .trim()
    .replace(/[\/\\]/g, "_")
    .replace(/[^\w.\-()\s]/g, "_");
}

type Viewer =
  | { ok: true; userId: string }
  | { ok: false; code: "NO_USER_ROW" }
  | null;

async function getViewer(): Promise<Viewer> {
  const me = await getServerRole();
  const sub = String(me?.sub ?? "").trim();
  if (!sub) return null;

  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!userRow?.id) return { ok: false, code: "NO_USER_ROW" };

  return { ok: true, userId: String(userRow.id) };
}

/* -------------------------------------------------------------------------- */
/* List documents */
/* -------------------------------------------------------------------------- */

export async function onboardingListMyDocuments(): Promise<
  ActionResult<ListItem[]>
> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, code: "UNAUTHENTICATED" };
    if (!viewer.ok) return { ok: false, code: "NO_USER_ROW" };

    const rows = await db
      .select({
        key: documents.key,
        name: documents.displayName,
        uploadedAt: documents.uploadedAt,
      })
      .from(documents)
      .where(eq(documents.userId, viewer.userId))
      .orderBy(desc(documents.uploadedAt));

    return {
      ok: true,
      data: rows.map((r) => ({
        key: r.key,
        name: r.name ?? r.key,
        size: 0,
        lastModified: r.uploadedAt
          ? new Date(r.uploadedAt).toISOString()
          : null,
      })),
    };
  } catch (e) {
    console.error("[onboardingListMyDocuments]", e);
    return { ok: false, code: "ERROR" };
  }
}

/* -------------------------------------------------------------------------- */
/* Create upload URL */
/* -------------------------------------------------------------------------- */

export async function onboardingCreateMyUploadUrl(input: {
  fileName: string;
  contentType?: string;
}): Promise<ActionResult<{ key: string; url: string }>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, code: "UNAUTHENTICATED" };
    if (!viewer.ok) return { ok: false, code: "NO_USER_ROW" };

    const cfg = getS3Config();
    if (!cfg) return { ok: false, code: "CONFIG_MISSING" };

    const key = `${viewer.userId}/${crypto.randomUUID()}-${sanitizeFileName(
      input.fileName
    )}`;

    const s3 = new S3Client({ region: cfg.region });

    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        ContentType: input.contentType ?? "application/octet-stream",
      }),
      { expiresIn: 300 }
    );

    return { ok: true, data: { key, url } };
  } catch (e) {
    console.error("[onboardingCreateMyUploadUrl]", e);
    return { ok: false, code: "ERROR" };
  }
}

/* -------------------------------------------------------------------------- */
/* Finalize upload (DB WRITE AFTER PUT) */
/* -------------------------------------------------------------------------- */

export async function onboardingFinalizeMyUpload(input: {
  key: string;
  fileName: string;
}): Promise<ActionResult<{ key: string }>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, code: "UNAUTHENTICATED" };
    if (!viewer.ok) return { ok: false, code: "NO_USER_ROW" };

    const key = String(input.key ?? "").trim();
    if (!key) return { ok: false, code: "ERROR", message: "Missing key." };

    // ✅ key must belong to this user (prevents writing other users’ keys)
    if (!key.startsWith(`${viewer.userId}/`)) {
      return { ok: false, code: "FORBIDDEN" };
    }

    const displayName = sanitizeFileName(input.fileName);

    // avoid duplicates if finalize is called twice
    const [exists] = await db
      .select({ key: documents.key })
      .from(documents)
      .where(and(eq(documents.userId, viewer.userId), eq(documents.key, key)))
      .limit(1);

    if (!exists) {
      await db.insert(documents).values({
        userId: viewer.userId,
        key,
        displayName,
        uploadedAt: new Date(),
      });
    }

    return { ok: true, data: { key } };
  } catch (e) {
    console.error("[onboardingFinalizeMyUpload]", e);
    return { ok: false, code: "ERROR" };
  }
}

/* -------------------------------------------------------------------------- */
/* Download URL */
/* -------------------------------------------------------------------------- */

export async function onboardingCreateMyDownloadUrl(
  key: string
): Promise<ActionResult<{ url: string }>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, code: "UNAUTHENTICATED" };
    if (!viewer.ok) return { ok: false, code: "NO_USER_ROW" };

    const cfg = getS3Config();
    if (!cfg) return { ok: false, code: "CONFIG_MISSING" };

    const cleanKey = String(key ?? "").trim();
    if (!cleanKey) return { ok: false, code: "ERROR", message: "Missing key." };

    // ✅ Verify ownership (don’t sign arbitrary keys)
    const [row] = await db
      .select({ key: documents.key })
      .from(documents)
      .where(
        and(eq(documents.userId, viewer.userId), eq(documents.key, cleanKey))
      )
      .limit(1);

    if (!row) return { ok: false, code: "FORBIDDEN" };

    const s3 = new S3Client({ region: cfg.region });

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: cleanKey,
      }),
      { expiresIn: 300 }
    );

    return { ok: true, data: { url } };
  } catch (e) {
    console.error("[onboardingCreateMyDownloadUrl]", e);
    return { ok: false, code: "ERROR" };
  }
}

/* -------------------------------------------------------------------------- */
/* Continue */
/* -------------------------------------------------------------------------- */

export async function saveDocuments(formData: FormData) {
  if (formData.get("acknowledged") !== "on") {
    redirect(`${NEXT_PATH}?err=ack`);
  }

  const me = await getServerRole();
  if (!me?.sub) {
    redirect(`/sign-in?next=${encodeURIComponent(NEXT_PATH)}`);
  }

  try {
    await db
      .update(users)
      .set({ onboardingStep: "QUESTIONS" as any })
      .where(eq(users.cognitoSub, me.sub));
  } catch (e) {
    console.error("[saveDocuments] step update failed", e);
  }

  redirect("/onboarding/questions");
}
