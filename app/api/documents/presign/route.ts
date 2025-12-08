// app/api/documents/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    const body = await req.json();
    const fileName: string = body.fileName;
    const contentType: string = body.contentType || "application/octet-stream";

    if (!fileName) {
      return NextResponse.json(
        { error: "Missing fileName" },
        { status: 400 }
      );
    }

    // e.g. users/<userId>/YYYY/<uuid>-filename
    // TODO: pull real user id from session / JWT
    const userId = "TODO-user-id";
    const fileKey = `users/${userId}/${year}/${randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

    return NextResponse.json({ uploadUrl, fileKey });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create presigned URL" },
      { status: 500 }
    );
  }
}
