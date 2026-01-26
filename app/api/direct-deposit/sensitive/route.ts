// app/api/direct-deposit/sensitive/route.ts
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { sql, eq } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

function clean(v: unknown, max = 255) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}
function normalizeEmail(v: unknown) {
  return clean(v, 255).toLowerCase();
}

/**
 * Accepts DIRECT_DEPOSIT_ENCRYPTION_KEY as:
 * - hex (64+ chars)
 * - base64
 * - base64url
 */
function getDirectDepositKey(): Buffer {
  const raw = (process.env.DIRECT_DEPOSIT_ENCRYPTION_KEY ?? "").trim();
  if (!raw) throw new Error("Missing DIRECT_DEPOSIT_ENCRYPTION_KEY env var.");

  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  const key = isHex
    ? Buffer.from(raw, "hex")
    : Buffer.from(
        raw,
        raw.includes("-") || raw.includes("_") ? ("base64url" as any) : "base64",
      );

  if (key.length !== 32) {
    throw new Error(
      "DIRECT_DEPOSIT_ENCRYPTION_KEY must decode to 32 bytes (AES-256).",
    );
  }
  return key;
}

/** AES-256-GCM decrypt from base64(iv|tag|ciphertext) */
function decryptGcm(payloadB64: string, key: Buffer) {
  const buf = Buffer.from(String(payloadB64 ?? ""), "base64");
  if (buf.length < 12 + 16 + 1) return "";

  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

async function requireAuthUser() {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const email = auth?.email ? normalizeEmail(auth.email) : "";
  if (!sub) return null;
  return { sub, email };
}

async function getOrCreateUserBySub(cognitoSub: string, email?: string) {
  const [existing] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing) {
    if (email && email !== existing.email) {
      const [updated] = await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning({ id: users.id, email: users.email });
      return updated ?? existing;
    }
    return existing;
  }

  if (!email) throw new Error("Missing email. Please sign in again.");

  const [created] = await db
    .insert(users)
    .values({ cognitoSub, email, updatedAt: new Date() } as any)
    .returning({ id: users.id, email: users.email });

  return created;
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuthUser();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const rows = await db.execute(sql`
      SELECT
        use_direct_deposit,
        routing_last4,
        account_last4,
        routing_encrypted,
        account_encrypted,
        updated_at
      FROM direct_deposit
      WHERE user_id = ${u.id}
      LIMIT 1
    `);

    const row: any = (rows as any)?.rows?.[0] ?? null;

    if (!row) {
      return NextResponse.json(
        { ok: true, exists: false, hasNumbersOnFile: false },
        { headers: NO_STORE_HEADERS },
      );
    }

    const hasNumbersOnFile = Boolean(
      row.routing_encrypted ||
        row.account_encrypted ||
        row.routing_last4 ||
        row.account_last4,
    );

    if (!row.use_direct_deposit) {
      return NextResponse.json(
        {
          ok: true,
          exists: true,
          useDirectDeposit: false,
          routingLast4: "",
          accountLast4: "",
          routingNumber: "",
          accountNumber: "",
          updatedAt: row.updated_at ?? null,
          hasNumbersOnFile,
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    const key = getDirectDepositKey();
    const routingNumber = row.routing_encrypted
      ? decryptGcm(String(row.routing_encrypted), key)
      : "";
    const accountNumber = row.account_encrypted
      ? decryptGcm(String(row.account_encrypted), key)
      : "";

    return NextResponse.json(
      {
        ok: true,
        exists: true,
        useDirectDeposit: true,
        routingLast4: String(row.routing_last4 ?? ""),
        accountLast4: String(row.account_last4 ?? ""),
        routingNumber,
        accountNumber,
        updatedAt: row.updated_at ?? null,
        hasNumbersOnFile,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (err: any) {
    console.error("GET /api/direct-deposit/sensitive error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
