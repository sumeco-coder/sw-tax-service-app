// app/api/documents/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { db } from "@/drizzle/db";
import { users, documents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

function sanitizeFileName(name: string) {
  const n = String(name ?? "file").trim() || "file";
  return n.replace(/[\/\\]/g, "_").replace(/[^\w.\-()\s]/g, "_");
}

function getS3Config() {
  const bucket =
    process.env.DOCUMENTS_BUCKET ||
    process.env.S3_BUCKET ||
    process.env.AWS_S3_BUCKET ||
    process.env.S3_BUCKET_NAME || // keep fallback if you already set it
    "";

  const region =
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.S3_REGION || // keep fallback if you already set it
    "";

  if (!bucket || !region) {
    throw new Error("Server S3 config missing (bucket/region).");
  }

  return { bucket, region };
}

export async function POST(req: NextRequest) {
  try {
    const me = await getServerRole();
    if (!me?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.cognitoSub, String(me.sub)))
      .limit(1);

    if (!u?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const fileName = sanitizeFileName(body.fileName);
    const contentType = String(body.contentType || "application/octet-stream");

    if (!fileName) {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
    }

    const { bucket, region } = getS3Config();
    const userId = String(u.id);

    // ✅ MATCH your existing documents/actions.ts format
    const fileKey = `${userId}/${randomUUID()}-${fileName}`;

    const s3 = new S3Client({ region });
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        ContentType: contentType,
      }),
      { expiresIn: 60 * 5 }
    );

    // ✅ Keep behavior consistent with createUploadUrl()
    await db.insert(documents).values({
      userId,
      key: fileKey,
      displayName: fileName,
      uploadedAt: new Date(),
    });

    return NextResponse.json({ uploadUrl, fileKey });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message || "Failed to create presigned URL" },
      { status: 500 }
    );
  }
}
