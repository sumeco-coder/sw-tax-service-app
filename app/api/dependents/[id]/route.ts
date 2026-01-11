// app/api/dependents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import crypto from "crypto";

import { db } from "@/drizzle/db";
import { users, dependents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";

// ---------- helpers ----------
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
function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

/**
 * Reads a 32-byte AES key from env.
 * Accepts:
 *  - hex (64+ chars)
 *  - base64
 *  - base64url (generated via toString("base64url"))
 */
function readAes256Key(envName: string): Buffer {
  const raw = (process.env[envName] ?? "").trim();
  if (!raw) throw new Error(`Missing ${envName} env var.`);

  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;

  // Node supports "base64url" in modern versions; keep the cast to satisfy TS if needed
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

  const ciphertext = Buffer.concat([
    cipher.update(ssn9, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `v1.${iv.toString("base64url")}.${tag.toString(
    "base64url"
  )}.${ciphertext.toString("base64url")}`;
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
  middleName: (dependents as any).middleName,
  lastName: dependents.lastName,
  dob: dependents.dob,
  relationship: dependents.relationship,
  monthsInHome: dependents.monthsInHome,
  isStudent: dependents.isStudent,
  isDisabled: dependents.isDisabled,
  appliedButNotReceived: (dependents as any).appliedButNotReceived,
  ssnEncrypted: (dependents as any).ssnEncrypted,
  createdAt: dependents.createdAt,
  updatedAt: dependents.updatedAt,
};

function toSafeDependent(r: any) {
  return {
    ...r,
    dob: r?.dob ? String(r.dob).slice(0, 10) : "",
    monthsLived: r?.monthsInHome ?? 12,
    hasSsn: !!r?.ssnEncrypted,
    // never leak encrypted value
    ssnEncrypted: "",
  };
}

// GET /api/dependents/[id] -> fetch one (optional but useful)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const auth = await requireAuth();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const [row] = await db
      .select(depCols as any)
      .from(dependents)
      .where(and(eq(dependents.id, id), eq(dependents.userId, u.id)))
      .limit(1);

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(toSafeDependent(row));
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/dependents/[id] -> partial edit
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const auth = await requireAuth();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const b = await request.json().catch(() => ({}));
    const set: any = { updatedAt: new Date() };

    // Strings (don’t allow setting required fields to empty)
    if (typeof b.firstName === "string") {
      const v = clean(b.firstName, 80);
      if (!v) return NextResponse.json({ error: "First name required" }, { status: 400 });
      set.firstName = v;
    }

    if (typeof b.middleName === "string") set.middleName = clean(b.middleName, 80);

    if (typeof b.lastName === "string") {
      const v = clean(b.lastName, 80);
      if (!v) return NextResponse.json({ error: "Last name required" }, { status: 400 });
      set.lastName = v;
    }

    if (typeof b.dob === "string") {
      const dobStr = clean(b.dob, 10);
      if (!isIsoDate(dobStr)) {
        return NextResponse.json(
          { error: "DOB must be YYYY-MM-DD" },
          { status: 400 }
        );
      }
      set.dob = dobStr;
    }

    if (typeof b.relationship === "string") {
      const v = clean(b.relationship, 80);
      if (!v) return NextResponse.json({ error: "Relationship required" }, { status: 400 });
      set.relationship = v;
    }

    // months
    const monthsCandidate = b.monthsInHome ?? b.monthsLived;
    if (monthsCandidate != null) {
      const n = Number(monthsCandidate);
      if (Number.isFinite(n)) set.monthsInHome = Math.max(0, Math.min(12, Math.trunc(n)));
    }

    // booleans
    if (b.isStudent != null) set.isStudent = Boolean(b.isStudent);
    if (b.isDisabled != null) set.isDisabled = Boolean(b.isDisabled);

    // SSN rules
    const appliedIncoming =
      b.appliedButNotReceived != null ? Boolean(b.appliedButNotReceived) : null;

    const ssnIncoming = typeof b.ssn === "string" ? digitsOnly(b.ssn, 9) : "";

    // If they mark applied=true, they must NOT send SSN in same request
    if (appliedIncoming === true && ssnIncoming) {
      return NextResponse.json(
        { error: "Do not send SSN when marked applied-but-not-received." },
        { status: 400 }
      );
    }

    if (appliedIncoming != null) {
      set.appliedButNotReceived = appliedIncoming;
      if (appliedIncoming === true) set.ssnEncrypted = null;
    }

    // If SSN provided, encrypt and force applied=false
    if (ssnIncoming) {
      if (ssnIncoming.length !== 9) {
        return NextResponse.json(
          { error: "SSN must be 9 digits" },
          { status: 400 }
        );
      }
      set.ssnEncrypted = encryptSsn(ssnIncoming);
      set.appliedButNotReceived = false;
    }

    // nothing to update?
    if (Object.keys(set).length === 1) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const [updated] = await db
      .update(dependents)
      .set(set)
      .where(and(eq(dependents.id, id), eq(dependents.userId, u.id)))
      .returning(depCols as any);

    if (!updated)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(toSafeDependent(updated));
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/dependents/[id] -> remove
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const auth = await requireAuth();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const deleted = await db
      .delete(dependents)
      .where(and(eq(dependents.id, id), eq(dependents.userId, u.id)))
      .returning({ id: dependents.id });

    if (!deleted?.length)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
