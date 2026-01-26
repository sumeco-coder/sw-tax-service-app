// app/api/admin/clients/[userId]/ssn/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdminRole(role: string) {
  return ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(
    String(role || "").toUpperCase(),
  );
}

function requireRevealPrivilege(role: string) {
  return ["ADMIN", "SUPERADMIN"].includes(String(role || "").toUpperCase());
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

/**
 * SSN_ENCRYPTION_KEY must decode to 32 bytes (AES-256).
 * Supports: hex (64 chars), base64, base64url
 */
function getKey(): Buffer {
  const raw = (process.env.SSN_ENCRYPTION_KEY ?? "").trim();
  if (!raw) throw new Error("Missing SSN_ENCRYPTION_KEY env var.");

  // hex
  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  if (isHex) {
    const b = Buffer.from(raw, "hex");
    if (b.length === 32) return b;
  }

  // base64url
  try {
    const b = Buffer.from(raw, "base64url");
    if (b.length === 32) return b;
  } catch {}

  // base64
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {}

  throw new Error("SSN_ENCRYPTION_KEY must decode to 32 bytes (AES-256).");
}

/**
 * Decrypts:
 *  - v1.<iv_b64url>.<tag_b64url>.<ct_b64url>
 *  - legacy v1:<iv_b64>:<ct_b64>:<tag_b64>
 */
function decryptSsn(payload: string) {
  const raw = String(payload ?? "");
  const key = getKey();

  if (raw.startsWith("v1.")) {
    const parts = raw.split(".");
    if (parts.length !== 4) return "";
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ct = Buffer.from(parts[3], "base64url");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plain.toString("utf8");
  }

  if (raw.startsWith("v1:")) {
    const parts = raw.split(":");
    if (parts.length !== 4) return "";
    const iv = Buffer.from(parts[1], "base64");
    const ct = Buffer.from(parts[2], "base64");
    const tag = Buffer.from(parts[3], "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plain.toString("utf8");
  }

  return "";
}

function digitsOnly(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

function formatSsn(digits: string) {
  const d = digitsOnly(digits);
  if (d.length !== 9) return "";
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

async function resolveUser(idOrSub: string) {
  const key = String(idOrSub || "").trim();
  if (!key) return null;

  if (isUuid(key)) {
    const [u1] = await db
      .select({
        id: users.id,
        ssnLast4: (users as any).ssnLast4,
        ssnEncrypted: (users as any).ssnEncrypted,
        cognitoSub: users.cognitoSub,
      } as any)
      .from(users)
      .where(eq(users.id as any, key as any))
      .limit(1);

    if (u1) return u1;
  }

  const [u2] = await db
    .select({
      id: users.id,
      ssnLast4: (users as any).ssnLast4,
      ssnEncrypted: (users as any).ssnEncrypted,
      cognitoSub: users.cognitoSub,
    } as any)
    .from(users)
    .where(eq(users.cognitoSub, key))
    .limit(1);

  return u2 ?? null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const me = await getServerRole();
    if (!me) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const role = String((me as any).role ?? "");
    if (!isAdminRole(role)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const reveal = url.searchParams.get("reveal") === "1";

    if (reveal && !requireRevealPrivilege(role)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden: reveal requires ADMIN or SUPERADMIN" },
        { status: 403 },
      );
    }

    const user = await resolveUser(String(userId));
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "User not found." },
        { status: 404 },
      );
    }

    const last4 = String((user as any)?.ssnLast4 ?? "");
    const enc = String((user as any)?.ssnEncrypted ?? "");
    const hasSsn = Boolean(last4 || enc);

    // masked-only
    if (!reveal) {
      return NextResponse.json(
        { ok: true, hasSsn, last4 },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // reveal full
    if (!enc) {
      return NextResponse.json(
        { ok: true, hasSsn, last4, ssn: "" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const digits = decryptSsn(enc);
    const ssn = formatSsn(digits);

    // If last4 is missing but we can decrypt, derive it (nice for UI)
    const derivedLast4 = digitsOnly(digits).slice(-4);
    const safeLast4 = last4 || derivedLast4;

    return NextResponse.json(
      { ok: true, hasSsn, last4: safeLast4, ssn },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    console.error("GET /api/admin/clients/[userId]/ssn error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
