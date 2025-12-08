// lib/env.ts
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  NEXT_PUBLIC_AWS_S3_BUCKET_NAME: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "",
};
