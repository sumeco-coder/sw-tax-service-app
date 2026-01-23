"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { users, documents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
      code: "UNAUTHENTICATED" | "NO_USER_ROW" | "CONFIG_MISSING" | "FORBIDDEN" | "ERROR";
      message?: string;
    };

const NEXT_PATH = "/onboarding/documents";

function getS3Config() {
  const bucket =
    process.env.DOCUMENTS_BUCKET ||
    process.env.FILES_BUCKET ||
    process.env.S3_BUCKET_NAME || // ✅ add this
    process.env.S3_BUCKET ||
    process.env.AWS_S3_BUCKET ||
    "";

  const region =
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.S3_REGION || // ✅ optional
    "";

  if (!bucket || !region) {
    console.error("[getS3Config] CONFIG_MISSING", {
      hasBucket: !!bucket,
      hasRegion: !!region,
      DOCUMENTS_BUCKET: !!process.env.DOCUMENTS_BUCKET,
      FILES_BUCKET: !!process.env.FILES_BUCKET,
      S3_BUCKET_NAME: !!process.env.S3_BUCKET_NAME,
      S3_BUCKET: !!process.env.S3_BUCKET,
      AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET,
      AWS_REGION: !!process.env.AWS_REGION,
      AWS_DEFAULT_REGION: !!process.env.AWS_DEFAULT_REGION,
      S3_REGION: !!process.env.S3_REGION,
    });
    return null;
  }

  return { bucket, region };
}


function sanitizeFileName(name: string) {
  const n = String(name ?? "file").trim() || "file";
  return n.replace(/[\/\\]/g, "_").replace(/[^\w.\-()\s]/g, "_");
}

async function getViewer() {
  const me = await getServerRole();
  const sub = String(me?.sub ?? "").trim();
  if (!sub) return null;

  const [userRow] = await db
    .select({ id: users.id, cognitoSub: users.cognitoSub })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  return { sub, userRow };
}

/* ------------------------- DB-backed list (like /documents) ------------------------- */

export async function onboardingListMyDocuments(): Promise<ActionResult<ListItem[]>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, code: "UNAUTHENTICATED" };
    if (!viewer.userRow) return { ok: false, code: "NO_USER_ROW" };

    const rows = await db
      .select({
        key: documents.key,
        name: documents.displayName,
        uploadedAt: documents.uploadedAt,
      })
      .from(documents)
      .where(eq(documents.userId, String(viewer.userRow.id)))
      .orderBy(desc(documents.uploadedAt));

    const items: ListItem[] = (rows ?? []).map((r) => ({
      key: String(r.key),
      name: String(r.name ?? r.key),
      size: 0,
      lastModified: r.uploadedAt ? new Date(r.uploadedAt as any).toISOString() : null,
    }));

    return { ok: true, data: items };
  } catch (e: any) {
    console.error("[onboardingListMyDocuments] failed", e?.name, e?.message, e);
    return { ok: false, code: "ERROR" };
  }
}

/* ------------------------- presigned upload url + DB insert (like /documents) ------------------------- */

export async function onboardingCreateMyUploadUrl(input: {
  fileName: string;
  contentType?: string;
}): Promise<ActionResult<{ key: string; url: string }>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, code: "UNAUTHENTICATED" };
    if (!viewer.userRow) return { ok: false, code: "NO_USER_ROW" };

    const cfg = getS3Config();
    if (!cfg) return { ok: false, code: "CONFIG_MISSING" };

    const fileName = sanitizeFileName(input.fileName);
    const contentType = String(input.contentType ?? "application/octet-stream");

    const targetUserId = String(viewer.userRow.id);
    const key = `${targetUserId}/${crypto.randomUUID()}-${fileName}`;

    const s3 = new S3Client({ region: cfg.region });

    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 60 * 5 }
    );

    // Insert DB row so it shows in lists immediately
    await db.insert(documents).values({
      userId: targetUserId,
      key,
      displayName: fileName,
      uploadedAt: new Date(),
    });

    return { ok: true, data: { key, url } };
  } catch (e: any) {
    console.error("[onboardingCreateMyUploadUrl] failed", e?.name, e?.message, e);
    return { ok: false, code: "ERROR" };
  }
}

/* ------------------------- presigned download url (owner-only) ------------------------- */

export async function onboardingCreateMyDownloadUrl(
  key: string
): Promise<ActionResult<{ url: string }>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, code: "UNAUTHENTICATED" };
    if (!viewer.userRow) return { ok: false, code: "NO_USER_ROW" };

    const cfg = getS3Config();
    if (!cfg) return { ok: false, code: "CONFIG_MISSING" };

    const k = String(key ?? "").trim();
    if (!k) return { ok: false, code: "ERROR", message: "Missing key." };

    const targetUserId = String(viewer.userRow.id);

    // Ensure this key belongs to this user
    const [doc] = await db
      .select({ key: documents.key, ownerId: documents.userId })
      .from(documents)
      .where(eq(documents.key, k))
      .limit(1);

    if (!doc) return { ok: false, code: "ERROR", message: "Document not found." };
    if (String(doc.ownerId) !== targetUserId) return { ok: false, code: "FORBIDDEN" };

    const s3 = new S3Client({ region: cfg.region });

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: cfg.bucket, Key: k }),
      { expiresIn: 60 * 5 }
    );

    return { ok: true, data: { url } };
  } catch (e: any) {
    console.error("[onboardingCreateMyDownloadUrl] failed", e?.name, e?.message, e);
    return { ok: false, code: "ERROR" };
  }
}

/* ------------------------- continue to next step ------------------------- */

export async function saveDocuments(formData: FormData) {
  const acknowledged = String(formData.get("acknowledged") ?? "") === "on";
  if (!acknowledged) {
    // client already blocks, but keep server safe
    redirect(`${NEXT_PATH}?err=ack`);
  }

  const me = await getServerRole();
  const sub = String(me?.sub ?? "").trim();
  if (!sub) redirect(`/sign-in?next=${encodeURIComponent(NEXT_PATH)}`);

  // OPTIONAL: if you have an enum step, set it here.
  // Wrap in try so it never crashes prod if enum differs.
  try {
    await db
      .update(users)
      .set({ onboardingStep: "QUESTIONS" as any })
      .where(eq(users.cognitoSub, sub));
  } catch (e) {
    console.error("[saveDocuments] onboardingStep update skipped/failed:", e);
  }

  redirect("/onboarding/questions");
}
