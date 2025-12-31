import crypto from "crypto";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM
const TAG_LENGTH = 16;

/* ─────────────────────────────────────────────
   Key registry (rotation-safe)
   Keys MUST be base64-encoded 32 bytes
───────────────────────────────────────────── */
const KEYS: Record<string, Buffer> = {
  v1: Buffer.from(process.env.MESSAGE_KEY_V1!, "base64"),
  v2: Buffer.from(process.env.MESSAGE_KEY_V2!, "base64"),
};

/* ─────────────────────────────────────────────
   Encrypt
───────────────────────────────────────────── */
export function encryptMessage(
  plainText: string,
  keyVersion: keyof typeof KEYS = "v2"
): string {
  const key = KEYS[keyVersion];
  if (!key) throw new Error(`Encryption key ${keyVersion} not found`);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  /*
    Payload layout:
    [IV (12)] [AUTH TAG (16)] [CIPHERTEXT (...)]
  */
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/* ─────────────────────────────────────────────
   Decrypt
───────────────────────────────────────────── */
export function decryptMessage(
  payload: string,
  keyVersion: keyof typeof KEYS = "v2"
): string {
  const key = KEYS[keyVersion];
  if (!key) throw new Error(`Decryption key ${keyVersion} not found`);

  const buffer = Buffer.from(payload, "base64");

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(
    IV_LENGTH,
    IV_LENGTH + TAG_LENGTH
  );
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted, undefined, "utf8") +
    decipher.final("utf8");
}
