// app/api/dependents/route.ts
import { NextResponse } from "next/server";
import { randomUUID, randomBytes, createCipheriv } from "crypto";
import { eq, desc } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users, dependents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";

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
 * AES-256-GCM encryption for SSN-at-rest.
 * Env var must be 32 bytes base64 (not hex): SSN_ENCRYPTION_KEY
 * Output format: v1.<iv>.<tag>.<ciphertext> (base64url-ish)
 */
function encryptSsn(ssn9: string) {
  const keyB64 = process.env.SSN_ENCRYPTION_KEY ?? "";
  if (!keyB64) throw new Error("Missing SSN_ENCRYPTION_KEY on server.");

  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32)
    throw new Error("SSN_ENCRYPTION_KEY must be 32 bytes base64.");

  const iv = randomBytes(12); // GCM recommended IV length
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(ssn9, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // store as compact text
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

async function requireAuth() {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const email = auth?.email ? normalizeEmail(auth.email) : "";
  if (!sub) return null;
  return { sub, email };
}

/** only select what we need (prevents crashes when DB schema != app schema) */
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
    .values({
      cognitoSub,
      email,
      updatedAt: new Date(),
    } as any)
    .returning(userCols);

  return created;
}

const depCols = {
  id: dependents.id,
  userId: dependents.userId,
  firstName: dependents.firstName,
  middleName: (dependents as any).middleName,
  lastName: dependents.lastName,
  dob: dependents.dob,
  relationship: dependents.relationship,
  monthsInHome: dependents.monthsInHome,
  isStudent: dependents.isStudent,
  isDisabled: dependents.isDisabled,
  appliedButNotReceived: (dependents as any).appliedButNotReceived, // adjust/remove if not in schema
  ssnEncrypted: (dependents as any).ssnEncrypted, // used ONLY to compute hasSsn
  createdAt: dependents.createdAt,
  updatedAt: dependents.updatedAt,
};

// GET /api/dependents -> list
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const rows = await db
      .select(depCols as any)
      .from(dependents)
      .where(eq(dependents.userId, u.id))
      .orderBy(desc(dependents.createdAt));

    const data = rows.map((r: any) => ({
      ...r,
      dob: r.dob ? String(r.dob).slice(0, 10) : "",
      monthsLived: r.monthsInHome ?? 12, // keep your page working
      hasSsn: !!r.ssnEncrypted, // ✅ safe UI flag
      ssnEncrypted: "", // ✅ keep UI field without leaking encrypted value
    }));

    // ensure we never leak stored encrypted value
    data.forEach((d: any) => delete d.ssnEncrypted);

    // re-add placeholder after delete (so it always exists)
    const safe = data.map((d: any) => ({ ...d, ssnEncrypted: "" }));

    return NextResponse.json(safe);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/dependents -> create
export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);
    const b = await req.json().catch(() => ({}));

    const firstName = clean(b.firstName, 80);
    const middleName = clean(b.middleName ?? 60);
    const lastName = clean(b.lastName, 80);
    const dobStr = clean(b.dob, 10); // YYYY-MM-DD
    const relationship = clean(b.relationship, 80);

    const applied = !!b.appliedButNotReceived;

    // New questionnaire sends ssn (9 digits)
    const ssn9 = digitsOnly(b.ssn, 9);

    // accept either monthsLived (UI) or monthsInHome (DB)
    const monthsRaw = b.monthsLived ?? b.monthsInHome ?? 12;
    const monthsInHome = Math.max(0, Math.min(12, Number(monthsRaw) || 0));

    const isStudent = !!b.isStudent;
    const isDisabled = !!b.isDisabled;

    if (!firstName || !lastName || !dobStr || !relationship) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If they DIDN'T mark applied, they must provide full ssn9 (since we’re no longer relying on last4)
    if (!applied && ssn9.length !== 9) {
      return NextResponse.json(
        {
          error:
            "Full 9-digit SSN is required unless marked applied-but-not-received.",
        },
        { status: 400 }
      );
    }

    const ssnEncrypted = ssn9.length === 9 ? encryptSsn(ssn9) : null;

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
      ssnEncrypted, // ✅ this is what you wanted stored
      updatedAt: new Date(),
    };

    const [created] = await db
      .insert(dependents)
      .values(row)
      .returning(depCols as any);

    // never return encrypted value to client
    const safe = {
      ...created,
      dob: created?.dob ? String(created.dob).slice(0, 10) : "",
      monthsLived: created?.monthsInHome ?? 12,
      hasSsn: !!created?.ssnEncrypted,
      ssnEncrypted: "", // ✅ UI-friendly placeholder
    };

    return NextResponse.json(safe, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
