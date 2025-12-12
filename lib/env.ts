// lib/env.ts
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export const env = {
  // Only read when accessed (no import-time crash)
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },

  // Public env can stay as a normal read, but keep it safe
  get NEXT_PUBLIC_AWS_S3_BUCKET_NAME() {
    return process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "";
  },
};
