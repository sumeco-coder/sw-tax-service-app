// app/api/direct-deposit/route.ts
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { z } from "zod";
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

const ACCOUNT_TYPES = ["checking", "savings"] as const;

const bodySchema = z.object({
  useDirectDeposit: z.boolean(),
  accountHolderName: z.string().trim().default(""),
  bankName: z.string().trim().default(""),
  accountType: z.enum(ACCOUNT_TYPES).default("checking"),
  routingNumber: z.string().default(""),
  accountNumber: z.string().default(""),
  confirmAccountNumber: z.string().default(""),
});

function clean(v: unknown, max = 255) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}
function normalizeEmail(v: unknown) {
  return clean(v, 255).toLowerCase();
}
function digitsOnly(v: unknown, maxLen: number) {
  return String(v ?? "").replace(/\D/g, "").slice(0, maxLen);
}
function last4(v: string) {
  const d = String(v ?? "").replace(/\D/g, "");
  return d ? d.slice(-4) : "";
}

function isValidAbaRouting(routing: string) {
  if (!/^\d{9}$/.test(routing)) return false;
  const d = routing.split("").map((x) => Number(x));
  const sum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    1 * (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
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

/** AES-256-GCM encrypt -> base64(iv|tag|ciphertext) */
function encryptGcm(plain: string, key: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
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

async function readDirectDepositSafe(userId: string) {
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
    WHERE user_id = ${userId}
    LIMIT 1
  `);

  const row: any = (rows as any)?.rows?.[0] ?? null;

  const hasNumbersOnFile = Boolean(
    row?.routing_encrypted ||
      row?.account_encrypted ||
      row?.routing_last4 ||
      row?.account_last4,
  );

  if (!row) {
    return {
      useDirectDeposit: false,
      accountHolderName: "",
      bankName: "",
      accountType: "checking" as const,
      routingLast4: "",
      accountLast4: "",
      updatedAt: null as string | null,
      hasNumbersOnFile: false,
    };
  }

  return {
    useDirectDeposit: Boolean(row.use_direct_deposit),
    accountHolderName: String(row.account_holder_name ?? ""),
    bankName: String(row.bank_name ?? ""),
    accountType: (row.account_type === "savings" ? "savings" : "checking") as
      | "checking"
      | "savings",
    routingLast4: String(row.routing_last4 ?? ""),
    accountLast4: String(row.account_last4 ?? ""),
    updatedAt: row.updated_at ?? null,
    hasNumbersOnFile,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuthUser();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);
    const safe = await readDirectDepositSafe(u.id);

    return NextResponse.json(safe, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    console.error("GET /api/direct-deposit error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthUser();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const raw = parsed.data;

    const routing = digitsOnly(raw.routingNumber, 9);
    const account = digitsOnly(raw.accountNumber, 25);
    const confirm = digitsOnly(raw.confirmAccountNumber, 25);

    // ✅ Enable-only toggle (ONLY if numbers already exist on file)
    const enablingOnly = raw.useDirectDeposit && !routing && !account && !confirm;

    if (enablingOnly) {
      const existingSafe = await readDirectDepositSafe(u.id);
      if (!existingSafe.hasNumbersOnFile) {
        return NextResponse.json(
          {
            error:
              "To enable direct deposit, please enter routing and account numbers (none are currently on file).",
          },
          { status: 400, headers: NO_STORE_HEADERS },
        );
      }

      await db.execute(sql`
        INSERT INTO direct_deposit (user_id, use_direct_deposit, created_at, updated_at)
        VALUES (${u.id}, true, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          use_direct_deposit = true,
          updated_at = NOW()
      `);

      const safe = await readDirectDepositSafe(u.id);
      return NextResponse.json({ ok: true, ...safe }, { headers: NO_STORE_HEADERS });
    }

    // ✅ Toggle OFF (scrub)
    if (!raw.useDirectDeposit) {
      await db.execute(sql`
        INSERT INTO direct_deposit (
          user_id, use_direct_deposit, account_holder_name, bank_name, account_type,
          routing_last4, account_last4, routing_encrypted, account_encrypted, created_at, updated_at
        )
        VALUES (${u.id}, false, '', '', 'checking', '', '', '', '', NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          use_direct_deposit = EXCLUDED.use_direct_deposit,
          account_holder_name = EXCLUDED.account_holder_name,
          bank_name = EXCLUDED.bank_name,
          account_type = EXCLUDED.account_type,
          routing_last4 = EXCLUDED.routing_last4,
          account_last4 = EXCLUDED.account_last4,
          routing_encrypted = EXCLUDED.routing_encrypted,
          account_encrypted = EXCLUDED.account_encrypted,
          updated_at = NOW()
      `);

      const safe = await readDirectDepositSafe(u.id);
      return NextResponse.json({ ok: true, ...safe }, { headers: NO_STORE_HEADERS });
    }

    // ✅ Full save (requires details)
    if (!raw.accountHolderName.trim()) {
      return NextResponse.json(
        { error: "Account holder name is required" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    if (!raw.bankName.trim()) {
      return NextResponse.json(
        { error: "Bank name is required" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    if (routing.length !== 9) {
      return NextResponse.json(
        { error: "Routing must be 9 digits" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    if (!isValidAbaRouting(routing)) {
      return NextResponse.json(
        { error: "Routing number doesn’t look valid" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    if (account.length < 4) {
      return NextResponse.json(
        { error: "Account number is required" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    if (confirm && confirm !== account) {
      return NextResponse.json(
        { error: "Account numbers do not match" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const key = getDirectDepositKey();

    const routingLast4 = last4(routing);
    const accountLast4 = last4(account);

    const routingEnc = encryptGcm(routing, key);
    const accountEnc = encryptGcm(account, key);

    await db.execute(sql`
      INSERT INTO direct_deposit (
        user_id, use_direct_deposit, account_holder_name, bank_name, account_type,
        routing_last4, account_last4, routing_encrypted, account_encrypted, created_at, updated_at
      )
      VALUES (
        ${u.id},
        true,
        ${raw.accountHolderName.trim()},
        ${raw.bankName.trim()},
        ${raw.accountType},
        ${routingLast4},
        ${accountLast4},
        ${routingEnc},
        ${accountEnc},
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        use_direct_deposit = EXCLUDED.use_direct_deposit,
        account_holder_name = EXCLUDED.account_holder_name,
        bank_name = EXCLUDED.bank_name,
        account_type = EXCLUDED.account_type,
        routing_last4 = EXCLUDED.routing_last4,
        account_last4 = EXCLUDED.account_last4,
        routing_encrypted = EXCLUDED.routing_encrypted,
        account_encrypted = EXCLUDED.account_encrypted,
        updated_at = NOW()
    `);

    const safe = await readDirectDepositSafe(u.id);
    return NextResponse.json({ ok: true, ...safe }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    console.error("POST /api/direct-deposit error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
