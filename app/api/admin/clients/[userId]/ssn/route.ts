// app/api/admin/clients/[userId]/ssn/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdminRole(role: string) {
  return ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(role);
}

function requireRevealPrivilege(role: string) {
  return ["ADMIN", "SUPERADMIN"].includes(role);
}


function getKey(): Buffer {
  const raw = (process.env.SSN_ENCRYPTION_KEY ?? "").trim();
  if (!raw) throw new Error("Missing SSN_ENCRYPTION_KEY env var.");

  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  const key = isHex
    ? Buffer.from(raw, "hex")
    : Buffer.from(
        raw,
        raw.includes("-") || raw.includes("_") ? ("base64url" as any) : "base64"
      );

  if (key.length !== 32) throw new Error("SSN_ENCRYPTION_KEY must decode to 32 bytes.");
  return key;
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

async function resolveUser(idOrSub: string) {
  // Try DB id first
  const [u1] = await db
    .select({
      id: users.id,
      cognitoSub: users.cognitoSub,
      ssnLast4: users.ssnLast4,
      ssnEncrypted: users.ssnEncrypted,
    })
    .from(users)
    .where(eq(users.id as any, idOrSub as any))
    .limit(1);

  if (u1) return u1;

  // Fallback to cognitoSub
  const [u2] = await db
    .select({
      id: users.id,
      cognitoSub: users.cognitoSub,
      ssnLast4: users.ssnLast4,
      ssnEncrypted: users.ssnEncrypted,
    })
    .from(users)
    .where(eq(users.cognitoSub, idOrSub))
    .limit(1);

  return u2 ?? null;
}

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const me = await getServerRole();
    if (!me) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const role = String((me as any).role ?? "");
    if (!isAdminRole(role)) return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const reveal = url.searchParams.get("reveal") === "1";

    if (reveal && !requireRevealPrivilege(role)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden: reveal requires SUPERADMIN" },
        { status: 403 }
      );
    }

    const user = await resolveUser(String(params.userId));
    if (!user) return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });

    const last4 = String(user.ssnLast4 ?? "");
    const hasSsn = Boolean(last4);

    // default: masked only
    if (!reveal) {
      return NextResponse.json({ ok: true, hasSsn, last4 });
    }

    // reveal: full ssn if encrypted exists
    if (!hasSsn || !user.ssnEncrypted) {
      return NextResponse.json({ ok: true, hasSsn, last4, ssn: "" });
    }

    const digits = decryptSsn(String(user.ssnEncrypted));
    const ssn = formatSsn(digits);

    return NextResponse.json({ ok: true, hasSsn, last4, ssn });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
