// app/api/profile/ssn/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Supports SSN_ENCRYPTION_KEY as:
 * - hex (64+ chars)
 * - base64
 * - base64url (your "base url" format)
 */
function getKey(): Buffer {
  const raw = (process.env.SSN_ENCRYPTION_KEY ?? "").trim();
  if (!raw) throw new Error("Missing SSN_ENCRYPTION_KEY env var.");

  // 1) hex
  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  if (isHex) {
    const b = Buffer.from(raw, "hex");
    if (b.length === 32) return b;
  }

  // 2) base64url
  try {
    const b = Buffer.from(raw, "base64url");
    if (b.length === 32) return b;
  } catch {}

  // 3) base64
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {}

  throw new Error("SSN_ENCRYPTION_KEY must decode to 32 bytes (AES-256).");
}


function encryptSsn(plain: string) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // v1:<iv_b64>:<ct_b64>:<tag_b64>
  return `v1:${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

function decryptSsn(payload: string) {
  const raw = String(payload ?? "");
  if (!raw.startsWith("v1:")) return "";

  const parts = raw.split(":");
  if (parts.length !== 4) return "";

  const key = getKey();
  const iv = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

function formatSsn(digits: string) {
  const d = String(digits ?? "").replace(/\D/g, "");
  if (d.length !== 9) return "";
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

async function requireAuth() {
  const me = await getServerRole();
  if (!me) return null;

  // ✅ Cognito user id is `sub` in your auth helper
  const sub = String((me as any)?.sub ?? "").trim();
  if (!sub) return null;

  return { sub };
}

/**
 * GET /api/profile/ssn
 * - returns masked by default
 * GET /api/profile/ssn?reveal=1
 * - returns full formatted SSN (###-##-####) if on file
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const reveal = url.searchParams.get("reveal") === "1";

    const [row] = await db
      .select({
        ssnEncrypted: users.ssnEncrypted,
        ssnLast4: users.ssnLast4,
      })
      .from(users)
      .where(eq(users.cognitoSub, auth.sub))
      .limit(1);

    const last4 = String(row?.ssnLast4 ?? "");
    const hasSsn = Boolean(row?.ssnEncrypted) || Boolean(row?.ssnLast4);


    if (!reveal) {
      return NextResponse.json({ ok: true, hasSsn, last4 });
    }

    if (!hasSsn || !row?.ssnEncrypted) {
      return NextResponse.json({ ok: true, hasSsn, last4, ssn: "" });
    }

    const digits = decryptSsn(String(row.ssnEncrypted));
    const ssn = formatSsn(digits);

    return NextResponse.json({ ok: true, hasSsn, last4, ssn });
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile/ssn
 * Body: { ssn: "#########" } (digits ok, dashes ok)
 * - sets SSN once only (locked)
 */

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ssn = String(body?.ssn ?? "").replace(/\D/g, "");
    if (ssn.length !== 9) {
      return NextResponse.json({ message: "SSN must be 9 digits." }, { status: 400 });
    }

    const [row] = await db
      .select({
        ssnEncrypted: users.ssnEncrypted,
        ssnLast4: users.ssnLast4,
      })
      .from(users)
      .where(eq(users.cognitoSub, auth.sub))
      .limit(1);

    if (!row) return NextResponse.json({ message: "User not found." }, { status: 404 });

    // ✅ prevent updates once set
    if (row.ssnEncrypted || row.ssnLast4) {
      return NextResponse.json(
        { message: "SSN is already on file and cannot be changed in the portal." },
        { status: 409 }
      );
    }

    const last4 = ssn.slice(-4);
    const ssnEncrypted = encryptSsn(ssn);

    await db
      .update(users)
      .set({
        ssnEncrypted,
        ssnLast4: last4,
        ssnSetAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(users.cognitoSub, auth.sub));

    return NextResponse.json({ ok: true, last4 });
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
