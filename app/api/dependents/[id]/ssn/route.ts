import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users, dependents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/**
 * Supports SSN_ENCRYPTION_KEY as:
 * - hex (64+ chars)
 * - base64
 * - base64url
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
 * Decrypts dependent SSN format:
 *   v1.<iv_b64url>.<tag_b64url>.<ciphertext_b64url>
 * Also supports legacy profile format:
 *   v1:<iv_b64>:<ct_b64>:<tag_b64>
 */
function decryptSsn(payload: string) {
  const raw = String(payload ?? "");

  const key = getKey();

  // v1.<iv>.<tag>.<ct>
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

  // v1:<iv_b64>:<ct_b64>:<tag_b64>
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

function formatSsn(digits: string) {
  const d = String(digits ?? "").replace(/\D/g, "");
  if (d.length !== 9) return "";
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

async function requireAuth() {
  const me = await getServerRole();
  if (!me) return null;
  const sub = String((me as any)?.sub ?? "").trim();
  if (!sub) return null;
  return { sub };
}

// GET /api/dependents/[id]/ssn
// - default: masked data (hasSsn, last4)
// - ?reveal=1: returns { ssn: "###-##-####" } if on file
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id ?? "");
    if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const reveal = url.searchParams.get("reveal") === "1";

    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.cognitoSub, auth.sub))
      .limit(1);

    if (!u?.id) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [dep] = await db
      .select({
        ssnEncrypted: dependents.ssnEncrypted,
        ssnLast4: (dependents as any).ssnLast4,
        appliedButNotReceived: dependents.appliedButNotReceived,
      } as any)
      .from(dependents)
      .where(and(eq(dependents.id, id), eq(dependents.userId, u.id)))
      .limit(1);

    if (!dep) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const last4 = dep?.ssnLast4 ? String(dep.ssnLast4) : "";
    const hasSsn = Boolean(dep?.ssnEncrypted);

    if (!reveal) {
      return NextResponse.json({ ok: true, hasSsn, last4 });
    }

    // if applied-but-not-received or missing, nothing to reveal
    if (dep.appliedButNotReceived || !dep.ssnEncrypted) {
      return NextResponse.json({ ok: true, hasSsn, last4, ssn: "" });
    }

    const digits = decryptSsn(String(dep.ssnEncrypted));
    const ssn = formatSsn(digits);

    return NextResponse.json({ ok: true, hasSsn, last4, ssn });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
