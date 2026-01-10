// lib/crypto/messageCrypto.ts
import crypto from "crypto";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; 
const TAG_LENGTH = 16;

type KeyVersion = "v1" | "v2";
/* ─────────────────────────────────────────────
   Key registry (rotation-safe)
   Keys MUST be base64-encoded 32 bytes
───────────────────────────────────────────── */
const KEY_ENV: Record<KeyVersion, string> = {
  v1: "MESSAGE_KEY_V1",
  v2: "MESSAGE_KEY_V2",
};

const KEY_CACHE: Partial<Record<KeyVersion, Buffer>> = {};

function getKey(keyVersion: KeyVersion): Buffer {
  const cached = KEY_CACHE[keyVersion];
  if (cached) return cached;

  const envName = KEY_ENV[keyVersion];
  const b64 = process.env[envName];

  if (!b64) {
    // Important: throw here (runtime) rather than crashing at import/build time
    throw new Error(`Missing env var ${envName} (must be base64 of 32 bytes)`);
  }

  const key = Buffer.from(b64, "base64");

  // AES-256 requires a 32-byte key
  if (key.length !== 32) {
    throw new Error(
      `${envName} decoded length is ${key.length} bytes; expected 32 bytes (AES-256 key)`
    );
  }

  KEY_CACHE[keyVersion] = key;
  return key;
}
/* ─────────────────────────────────────────────
   Encrypt
───────────────────────────────────────────── */
export function encryptMessage(plainText: string, keyVersion: KeyVersion = "v2"): string {
  const key = getKey(keyVersion);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
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
export function decryptMessage(payload: string, keyVersion: KeyVersion = "v2"): string {
  const key = getKey(keyVersion);

  const buffer = Buffer.from(payload, "base64");

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
}