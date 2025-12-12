// app/api/documents/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function POST(req: NextRequest) {
  try {
    // Read env ONLY when the route is actually called
    const region = required("S3_REGION");
    const bucket = required("S3_BUCKET_NAME");
    const accessKeyId = required("AWS_ACCESS_KEY_ID");
    const secretAccessKey = required("AWS_SECRET_ACCESS_KEY");

    const s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    const body = await req.json();
    const fileName: string = body.fileName;
    const contentType: string = body.contentType || "application/octet-stream";

    if (!fileName) {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
    }

    // TODO: pull real user id from session / JWT
    const userId = "TODO-user-id";
    const fileKey = `users/${userId}/${year}/${randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

    return NextResponse.json({ uploadUrl, fileKey });
  } catch (err: any) {
    console.error(err);

    // If env is missing, return a clear 500 instead of crashing the whole app
    return NextResponse.json(
      { error: err?.message || "Failed to create presigned URL" },
      { status: 500 }
    );
  }
}
