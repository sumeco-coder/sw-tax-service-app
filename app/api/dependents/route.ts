// app/api/dependents/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import crypto from "crypto";
import { eq, desc } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users, dependents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -------- helpers --------
function clean(v: unknown, max = 255) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}
function normalizeEmail(v: unknown) {
  return clean(v, 255).toLowerCase();
}
function digitsOnly(v: unknown, maxLen: number) {
  return String(v ?? "")
    .replace(/\D/g, "")
    .slice(0, maxLen);
}

/**
 * Reads a 32-byte AES key from env.
 * Accepts: hex (64+ chars) | base64 | base64url
 */
function readAes256Key(envName: string): Buffer {
  const raw = (process.env[envName] ?? "").trim();
  if (!raw) throw new Error(`Missing ${envName} env var.`);

  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  const key = isHex
    ? Buffer.from(raw, "hex")
    : Buffer.from(
        raw,
        raw.includes("-") || raw.includes("_") ? ("base64url" as any) : "base64"
      );

  if (key.length !== 32) {
    throw new Error(`${envName} must decode to 32 bytes (AES-256).`);
  }
  return key;
}

/**
 * AES-256-GCM encryption for SSN-at-rest.
 * Output format: v1.<iv>.<tag>.<ciphertext> (base64url)
 */
function encryptSsn(ssn9: string) {
  const key = readAes256Key("SSN_ENCRYPTION_KEY");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(ssn9, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

async function requireAuth() {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const email = auth?.email ? normalizeEmail(auth.email) : "";
  if (!sub) return null;
  return { sub, email };
}

/** map cognitoSub -> users.id (UUID). creates shell row if missing */
async function getOrCreateUserBySub(cognitoSub: string, email?: string) {
  const userCols = {
    id: users.id,
    cognitoSub: users.cognitoSub,
    email: users.email,
  };

  const [existing] = await db
    .select(userCols)
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing) {
    if (email && email !== existing.email) {
      const [updated] = await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning(userCols);
      return updated ?? existing;
    }
    return existing;
  }

  if (!email) throw new Error("Missing email. Please sign in again.");

  const [created] = await db
    .insert(users)
    .values({ cognitoSub, email, updatedAt: new Date() } as any)
    .returning(userCols);

  return created;
}

const depCols = {
  id: dependents.id,
  userId: dependents.userId,
  firstName: dependents.firstName,
  middleName: dependents.middleName,
  lastName: dependents.lastName,
  dob: dependents.dob,
  relationship: dependents.relationship,
  monthsInHome: dependents.monthsInHome,
  isStudent: dependents.isStudent,
  isDisabled: dependents.isDisabled,
  appliedButNotReceived: dependents.appliedButNotReceived,

  // SSN storage (never return encrypted)
  ssnEncrypted: dependents.ssnEncrypted,
  ssnLast4: (dependents as any).ssnLast4,
  ssnSetAt: (dependents as any).ssnSetAt,

  createdAt: dependents.createdAt,
  updatedAt: dependents.updatedAt,
};

function toSafeDependent(r: any) {
  return {
    ...r,
    dob: r?.dob ? String(r.dob).slice(0, 10) : "",
    monthsLived: r?.monthsInHome ?? 12,
    hasSsn: !!r?.ssnEncrypted,

    ssnLast4: r?.ssnLast4 ?? null,
    ssnSetAt: r?.ssnSetAt ?? null,

    ssnEncrypted: "", // never leak encrypted value
  };
}

// GET /api/dependents -> list
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const rows = await db
      .select(depCols as any)
      .from(dependents)
      .where(eq(dependents.userId, u.id))
      .orderBy(desc(dependents.createdAt));

    return NextResponse.json(rows.map(toSafeDependent));
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

// POST /api/dependents -> create
export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);
    const b = await req.json().catch(() => ({}));

    const firstName = clean(b.firstName, 80);
    const middleName = clean(b.middleName ?? "", 80);
    const lastName = clean(b.lastName, 80);
    const dobStr = clean(b.dob, 10); // YYYY-MM-DD
    const relationship = clean(b.relationship, 80);

    const applied = !!b.appliedButNotReceived;
    const ssn9 = digitsOnly(b.ssn, 9);

    const monthsRaw = b.monthsLived ?? b.monthsInHome ?? 12;
    const monthsInHome = Math.max(0, Math.min(12, Number(monthsRaw) || 0));

    const isStudent = !!b.isStudent;
    const isDisabled = !!b.isDisabled;

    if (!firstName || !lastName || !dobStr || !relationship) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (applied && ssn9) {
      return NextResponse.json(
        { error: "Do not send SSN when marked applied-but-not-received." },
        { status: 400 }
      );
    }

    // If they DIDN'T mark applied, require full ssn9
    if (!applied && ssn9.length !== 9) {
      return NextResponse.json(
        { error: "Full 9-digit SSN is required unless marked applied-but-not-received." },
        { status: 400 }
      );
    }

    const ssnEncrypted = !applied && ssn9.length === 9 ? encryptSsn(ssn9) : null;
    const ssnLast4 = !applied && ssn9.length === 9 ? ssn9.slice(-4) : null;
    const ssnSetAt = !applied && ssn9.length === 9 ? new Date() : null;

    const row: any = {
      id: randomUUID(),
      userId: u.id,
      firstName,
      middleName,
      lastName,
      dob: dobStr,
      relationship,
      monthsInHome,
      isStudent,
      isDisabled,
      appliedButNotReceived: applied,

      ssnEncrypted,
      ssnLast4,
      ssnSetAt,

      updatedAt: new Date(),
    };

    const [created] = await db
      .insert(dependents)
      .values(row)
      .returning(depCols as any);

    return NextResponse.json(toSafeDependent(created), { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
