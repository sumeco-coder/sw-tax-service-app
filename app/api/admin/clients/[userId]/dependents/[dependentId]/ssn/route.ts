// app/api/admin/clients/[userId]/dependents/[dependentId]/ssn/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { dependents, users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdminRole(role: string) {
  return ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(
    String(role ?? "").toUpperCase(),
  );
}

function requireRevealPrivilege(role: string) {
  return ["ADMIN", "SUPERADMIN"].includes(String(role ?? "").toUpperCase());
}

/** SSN_ENCRYPTION_KEY: hex | base64 | base64url -> 32 bytes */
function readAes256Key(envName: string): Buffer {
  const raw = (process.env[envName] ?? "").trim();
  if (!raw) throw new Error(`Missing ${envName} env var.`);

  const looksHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  if (looksHex) {
    const b = Buffer.from(raw, "hex");
    if (b.length !== 32) throw new Error(`${envName} must decode to 32 bytes (hex).`);
    return b;
  }

  try {
    const b = Buffer.from(raw, "base64url");
    if (b.length === 32) return b;
  } catch {}

  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {}

  throw new Error(`${envName} must decode to 32 bytes (AES-256).`);
}

/** dependents format: v1.<iv_b64url>.<tag_b64url>.<ct_b64url> */
function decryptDependentSsn(payload: string) {
  const raw = String(payload ?? "");
  if (!raw.startsWith("v1.")) return "";

  const parts = raw.split(".");
  if (parts.length !== 4) return "";

  const key = readAes256Key("SSN_ENCRYPTION_KEY");
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ct = Buffer.from(parts[3], "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

function formatSsn(digitsOrFormatted: string) {
  const d = String(digitsOrFormatted ?? "").replace(/\D/g, "").slice(0, 9);
  if (d.length !== 9) return "";
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
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
  { params }: { params: { userId: string; dependentId: string } },
) {
  try {
    const me = await getServerRole();
    if (!me) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const role = String((me as any).role ?? "");
    if (!isAdminRole(role)) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const reveal = url.searchParams.get("reveal") === "1";

    if (reveal && !requireRevealPrivilege(role)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden: reveal requires ADMIN or SUPERADMIN" },
        { status: 403 },
      );
    }

    const u = await resolveUser(String(params.userId));
    if (!u) {
      return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
    }

    const rows = await db.execute(sql`
      SELECT
        id,
        applied_but_not_received,
        ssn_encrypted,
        ssn_last4
      FROM dependents
      WHERE user_id = ${u.id}
        AND id = ${params.dependentId}
      LIMIT 1
    `);

    const row: any = (rows as any)?.rows?.[0] ?? null;
    if (!row) {
      return NextResponse.json({ ok: false, message: "Dependent not found." }, { status: 404 });
    }

    const applied = Boolean(row.applied_but_not_received);
    const last4 = String(row.ssn_last4 ?? "");
    const hasSsn = Boolean(row.ssn_encrypted || last4);

    // default: masked only
    if (!reveal) {
      return NextResponse.json({
        ok: true,
        appliedButNotReceived: applied,
        hasSsn,
        last4,
        ssn: "",
      });
    }

    // reveal: full ssn (formatted) if allowed + exists
    if (applied || !row.ssn_encrypted) {
      return NextResponse.json({
        ok: true,
        appliedButNotReceived: applied,
        hasSsn,
        last4,
        ssn: "",
      });
    }

    const digits = decryptDependentSsn(String(row.ssn_encrypted));
    const ssn = formatSsn(digits);

    return NextResponse.json({
      ok: true,
      appliedButNotReceived: applied,
      hasSsn,
      last4,
      ssn,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
