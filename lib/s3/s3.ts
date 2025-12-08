// lib/s3/s3.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION!;
const bucket = process.env.AWS_S3_BUCKET_NAME!;

if (!region || !bucket) {
  throw new Error("Missing AWS_REGION or AWS_S3_BUCKET_NAME env vars");
}

export const s3 = new S3Client({
  region,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined, // in prod you can rely on IAM role
});

export async function uploadToS3(file: File, key: string) {
  const arrayBuffer = await file.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: file.type,
  });

  await s3.send(putCommand);

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { key, url };
}

export async function deleteFromS3(key: string) {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3.send(deleteCommand);
}
