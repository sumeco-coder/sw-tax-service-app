// app/api/admin/clients/[userId]/direct-deposit/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
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

/**
 * Accepts DIRECT_DEPOSIT_ENCRYPTION_KEY as hex/base64/base64url -> 32 bytes
 */
function getDirectDepositKey(): Buffer {
  const raw = (process.env.DIRECT_DEPOSIT_ENCRYPTION_KEY ?? "").trim();
  if (!raw) throw new Error("Missing DIRECT_DEPOSIT_ENCRYPTION_KEY env var.");

  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  const key = isHex
    ? Buffer.from(raw, "hex")
    : Buffer.from(
        raw,
        raw.includes("-") || raw.includes("_") ? ("base64url" as any) : "base64"
      );

  if (key.length !== 32) {
    throw new Error("DIRECT_DEPOSIT_ENCRYPTION_KEY must decode to 32 bytes (AES-256).");
  }
  return key;
}

/** base64(iv|tag|ciphertext) => plaintext utf8 */
function decryptGcm(encB64: string, key: Buffer) {
  const buf = Buffer.from(String(encB64 ?? ""), "base64");
  if (buf.length < 12 + 16) return "";
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

async function resolveUser(idOrSub: string) {
  const [u1] = await db
    .select({ id: users.id, cognitoSub: users.cognitoSub })
    .from(users)
    .where(eq(users.id as any, idOrSub as any))
    .limit(1);

  if (u1) return u1;

  const [u2] = await db
    .select({ id: users.id, cognitoSub: users.cognitoSub })
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

    const u = await resolveUser(String(params.userId));
    if (!u) return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });

    // direct_deposit table query (raw SQL via drizzle)
    const rows = await db.execute(sql`
      SELECT
        use_direct_deposit,
        account_holder_name,
        bank_name,
        account_type,
        routing_last4,
        account_last4,
        routing_encrypted,
        account_encrypted,
        updated_at
      FROM direct_deposit
      WHERE user_id = ${u.id}
      LIMIT 1
    `);

    const row: any = (rows as any)?.rows?.[0];

    // If no record, return default “empty”
    if (!row) {
      return NextResponse.json({
        ok: true,
        useDirectDeposit: false,
        accountHolderName: "",
        bankName: "",
        accountType: "checking" as const,
        routingLast4: "",
        accountLast4: "",
        updatedAt: null,
      });
    }

    const base = {
      ok: true,
      useDirectDeposit: Boolean(row.use_direct_deposit),
      accountHolderName: String(row.account_holder_name ?? ""),
      bankName: String(row.bank_name ?? ""),
      accountType: row.account_type === "savings" ? ("savings" as const) : ("checking" as const),
      routingLast4: String(row.routing_last4 ?? ""),
      accountLast4: String(row.account_last4 ?? ""),
      updatedAt: row.updated_at ?? null,
    };

    // masked-only response
    if (!reveal) return NextResponse.json(base);

    // reveal full routing + account numbers
    const key = getDirectDepositKey();
    const routingNumber = row.routing_encrypted ? decryptGcm(String(row.routing_encrypted), key) : "";
    const accountNumber = row.account_encrypted ? decryptGcm(String(row.account_encrypted), key) : "";

    return NextResponse.json({
      ...base,
      routingNumber,
      accountNumber,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
