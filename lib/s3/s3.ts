// lib/s3/s3.ts
import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

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

/** Upload a browser File (used by your onboarding uploads) */
export async function uploadToS3(file: File, key: string) {
  const { s3, region } = getS3();
  const bucket = getBucket();

  const arrayBuffer = await file.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: file.type || "application/octet-stream",
  });

  await s3.send(putCommand);

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { key, url, size: body.length };
}

/** Upload raw HTML as a file in S3 (used by agreements packet export) */
export async function uploadHtmlToS3(html: string, key: string) {
  const { s3, region } = getS3();
  const bucket = getBucket();

  const body = Buffer.from(html, "utf8");

  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "text/html; charset=utf-8",
    // Optional hardening:
    // ServerSideEncryption: "AES256",
  });

  await s3.send(putCommand);

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { key, url, size: body.length };
}

/** Upload any string content as a file in S3 (handy for txt/csv/json later) */
export async function uploadStringToS3(args: {
  content: string;
  key: string;
  contentType?: string;
}) {
  const { s3, region } = getS3();
  const bucket = getBucket();

  const body = Buffer.from(args.content, "utf8");

  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: args.key,
    Body: body,
    ContentType: args.contentType || "text/plain; charset=utf-8",
  });

  await s3.send(putCommand);

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${args.key}`;
  return { key: args.key, url, size: body.length };
}

export async function uploadBufferToS3(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
  contentDisposition?: string;
}) {
  const { s3, region } = getS3();
  const bucket = getBucket();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: Buffer.isBuffer(opts.body) ? opts.body : Buffer.from(opts.body),
      ContentType: opts.contentType,
      CacheControl: opts.cacheControl,
      ContentDisposition: opts.contentDisposition,
    })
  );

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${opts.key}`;
  return { key: opts.key, url };
}

export async function deleteFromS3(key: string) {
  const { s3 } = getS3();
  const bucket = getBucket();

  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3.send(deleteCommand);

  return { ok: true };
}
