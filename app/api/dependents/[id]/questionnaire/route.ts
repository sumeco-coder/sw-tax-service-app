import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";

import { db } from "@/drizzle/db";
import { users, dependents, dependentQuestionnaires } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// minimal validation (accept full object)
const BodySchema = z.object({}).passthrough();

// ---------- helpers ----------
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
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}
function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * Reads a 32-byte AES key from env.
 * Accepts hex/base64/base64url.
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

  if (key.length !== 32)
    throw new Error(`${envName} must decode to 32 bytes (AES-256).`);
  return key;
}

/**
 * AES-256-GCM encryption for SSN-at-rest.
 * Output: v1.<iv>.<tag>.<ciphertext> (base64url)
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

function stripSensitiveFromPayload(body: any) {
  // do NOT store SSN inside questionnaire JSON
  const { ssn, ssnEncrypted, ...rest } = body ?? {};
  return rest;
}

function coreDependentUpdateFromBody(body: any) {
  const set: any = {};

  if (typeof body.firstName === "string") {
    const v = clean(body.firstName, 80);
    if (v) set.firstName = v;
  }
  if (typeof body.middleName === "string")
    set.middleName = clean(body.middleName, 80);

  if (typeof body.lastName === "string") {
    const v = clean(body.lastName, 80);
    if (v) set.lastName = v;
  }

  if (typeof body.dob === "string") {
    const dobStr = clean(body.dob, 10);
    if (isIsoDate(dobStr)) set.dob = dobStr;
  }

  if (typeof body.relationship === "string") {
    const v = clean(body.relationship, 80);
    if (v) set.relationship = v;
  }

  const monthsCandidate = body.monthsInHome ?? body.monthsLived;
  if (monthsCandidate != null) {
    const n = Number(monthsCandidate);
    if (Number.isFinite(n))
      set.monthsInHome = Math.max(0, Math.min(12, Math.trunc(n)));
  }

  if (body.isStudent != null) set.isStudent = Boolean(body.isStudent);
  if (body.isDisabled != null) set.isDisabled = Boolean(body.isDisabled);

  const appliedIncoming =
    body.appliedButNotReceived != null
      ? Boolean(body.appliedButNotReceived)
      : null;

  const ssnIncoming =
    typeof body.ssn === "string" ? digitsOnly(body.ssn, 9) : "";

  if (appliedIncoming === true && ssnIncoming) {
    throw new Error("Do not send SSN when marked applied-but-not-received.");
  }

  if (appliedIncoming != null) {
    set.appliedButNotReceived = appliedIncoming;
    if (appliedIncoming === true) set.ssnEncrypted = null;
  }

  if (ssnIncoming) {
    if (ssnIncoming.length !== 9) throw new Error("SSN must be 9 digits");
    set.ssnEncrypted = encryptSsn(ssnIncoming);
    set.appliedButNotReceived = false;
  }

  return set;
}

// GET /api/dependents/[id]/questionnaire
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dependentId = String(params.id ?? "");
    if (!isUuid(dependentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const auth = await requireAuth();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    // confirm dependent belongs to user + get core fields
    const [dep] = await db
      .select({
        id: dependents.id,
        firstName: dependents.firstName,
        middleName: dependents.middleName,
        lastName: dependents.lastName,
        dob: dependents.dob,
        relationship: dependents.relationship,
        monthsInHome: dependents.monthsInHome,
        isStudent: dependents.isStudent,
        isDisabled: dependents.isDisabled,
        appliedButNotReceived: dependents.appliedButNotReceived,
        ssnEncrypted: dependents.ssnEncrypted,
      })
      .from(dependents)
      .where(and(eq(dependents.id, dependentId), eq(dependents.userId, u.id)))
      .limit(1);

    if (!dep) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [q] = await db
      .select({ payload: dependentQuestionnaires.payload })
      .from(dependentQuestionnaires)
      .where(
        and(
          eq(dependentQuestionnaires.dependentId, dependentId),
          eq(dependentQuestionnaires.userId, u.id)
        )
      )
      .limit(1);

    const ssnOnFile = !!dep.ssnEncrypted;

    const values = {
      ...(q?.payload ?? {}),

      firstName: dep.firstName ?? "",
      middleName: dep.middleName ?? "",
      lastName: dep.lastName ?? "",
      dob: dep.dob ? String(dep.dob).slice(0, 10) : "",
      relationship: dep.relationship ?? "",
      monthsInHome: String(dep.monthsInHome ?? 12),
      isStudent: !!dep.isStudent,
      isDisabled: !!dep.isDisabled,
      appliedButNotReceived: !!dep.appliedButNotReceived,
      ssn: "",
    };

    return NextResponse.json({ ok: true, values, meta: { ssnOnFile } });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/dependents/[id]/questionnaire
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dependentId = String(params.id ?? "");
    if (!isUuid(dependentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const auth = await requireAuth();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getOrCreateUserBySub(auth.sub, auth.email);

    const json = await req.json().catch(() => null);
    if (!json)
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // confirm dependent belongs to user
    const [dep] = await db
      .select({ id: dependents.id })
      .from(dependents)
      .where(and(eq(dependents.id, dependentId), eq(dependents.userId, u.id)))
      .limit(1);

    if (!dep) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body: any = parsed.data;

    // 1) update core dependent fields if present
    const coreSet = coreDependentUpdateFromBody(body);
    if (Object.keys(coreSet).length) {
      coreSet.updatedAt = new Date();
      await db
        .update(dependents)
        .set(coreSet)
        .where(
          and(eq(dependents.id, dependentId), eq(dependents.userId, u.id))
        );
    }

    // 2) upsert questionnaire payload
    const payload = stripSensitiveFromPayload(body);

    await db
      .insert(dependentQuestionnaires)
      .values({
        userId: u.id,
        dependentId,
        payload,
        updatedAt: new Date(),
      } as any)
      .onConflictDoUpdate({
        target: [dependentQuestionnaires.dependentId], // ✅ matches your unique index
        set: { payload, updatedAt: new Date() },
      });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
