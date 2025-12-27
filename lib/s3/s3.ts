// lib/s3/s3.ts
import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function requireRegion(): string {
  const region = (process.env.AWS_REGION ?? process.env.S3_REGION ?? "").trim();
  if (!region) {
    throw new Error("AWS_REGION (or S3_REGION) is not set");
  }
  return region;
}

function getS3() {
  const region = requireRegion();

  const credentials =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined;

  return { s3: new S3Client({ region, credentials }), region };
}

function getBucket() {
  return required("S3_BUCKET_NAME");
}

export async function uploadToS3(file: File, key: string) {
  const { s3, region } = getS3();
  const bucket = getBucket();

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
  const { s3 } = getS3();
  const bucket = getBucket();

  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3.send(deleteCommand);
}
