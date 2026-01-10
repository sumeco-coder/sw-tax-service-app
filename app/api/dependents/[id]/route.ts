// app/api/dependents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
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

function readAes256Key(envName: string): Buffer {
  const raw = (process.env[envName] ?? "").trim();
  if (!raw) throw new Error(`Missing ${envName} env var.`);

  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  const key = isHex
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, (raw.includes("-") || raw.includes("_")) ? ("base64url" as any) : "base64");

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

async function getOrCreateUserBySub(cognitoSub: string, email?: string) {
  const userCols = { id: users.id, cognitoSub: users.cognitoSub, email: users.email };

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

// PATCH /api/dependents/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const b = await request.json().catch(() => ({}));
    const set: any = { updatedAt: new Date() };

    if (typeof b.firstName === "string") set.firstName = clean(b.firstName, 80);
    if (typeof b.middleName === "string") set.middleName = clean(b.middleName, 80);
    if (typeof b.lastName === "string") set.lastName = clean(b.lastName, 80);

    if (typeof b.dob === "string") {
      const dobStr = clean(b.dob, 10);
      if (!isIsoDate(dobStr)) {
        return NextResponse.json({ error: "DOB must be YYYY-MM-DD" }, { status: 400 });
      }
      set.dob = dobStr;
    }

    if (typeof b.relationship === "string") set.relationship = clean(b.relationship, 80);

    const monthsCandidate = b.monthsInHome ?? b.monthsLived;
    if (monthsCandidate != null) {
      const n = Number(monthsCandidate);
      if (Number.isFinite(n)) set.monthsInHome = Math.max(0, Math.min(12, Math.trunc(n)));
    }

    if (b.isStudent != null) set.isStudent = Boolean(b.isStudent);
    if (b.isDisabled != null) set.isDisabled = Boolean(b.isDisabled);

    const appliedIncoming =
      b.appliedButNotReceived != null ? Boolean(b.appliedButNotReceived) : null;

    const ssnIncoming = typeof b.ssn === "string" ? digitsOnly(b.ssn, 9) : "";

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

    if (ssnIncoming) {
      if (ssnIncoming.length !== 9) {
        return NextResponse.json({ error: "SSN must be 9 digits" }, { status: 400 });
      }
      set.ssnEncrypted = encryptSsn(ssnIncoming);
      set.appliedButNotReceived = false;
    }

    if (Object.keys(set).length === 1) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const updated = await db
      .update(dependents)
      .set(set)
      .where(and(eq(dependents.id, id), eq(dependents.userId, u.id)))
      .returning({ id: dependents.id, updatedAt: dependents.updatedAt });

    if (!updated?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

// DELETE /api/dependents/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const deleted = await db
      .delete(dependents)
      .where(and(eq(dependents.id, id), eq(dependents.userId, u.id)))
      .returning({ id: dependents.id });

    if (!deleted?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
