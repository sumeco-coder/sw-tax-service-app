// app/api/profile/ssn/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

function getKey(): Buffer {
  const raw = process.env.SSN_ENCRYPTION_KEY;
  if (!raw) throw new Error("Missing SSN_ENCRYPTION_KEY env var.");

  // allow base64 or hex
  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;
  const key = isHex ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error("SSN_ENCRYPTION_KEY must be 32 bytes (base64 or hex).");
  }
  return key;
}

function encryptSsn(plain: string) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // v1:<iv_b64>:<ct_b64>:<tag_b64>
  return `v1:${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const me = await getServerRole();
    if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const cognitoSub = String((me as any).cognitoSub ?? "");
    if (!cognitoSub) {
      return NextResponse.json({ message: "Missing cognitoSub." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const ssn = String(body?.ssn ?? "").replace(/\D/g, "");
    if (ssn.length !== 9) {
      return NextResponse.json({ message: "SSN must be 9 digits." }, { status: 400 });
    }

    // ✅ prevent updates once set
    const existing = await db
      .select({
        ssnEncrypted: users.ssnEncrypted,
        ssnLast4: users.ssnLast4, // requires schema column
      })
      .from(users)
      .where(eq(users.cognitoSub, cognitoSub))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    if (row.ssnEncrypted || row.ssnLast4) {
      return NextResponse.json(
        { message: "SSN is already on file and cannot be changed in the portal." },
        { status: 409 }
      );
    }

    const last4 = ssn.slice(-4);
    const ssnEncrypted = encryptSsn(ssn);

    await db
      .update(users)
      .set({
        ssnEncrypted,
        ssnLast4: last4,
        ssnSetAt: new Date(),
      })
      .where(eq(users.cognitoSub, cognitoSub));

    return NextResponse.json({ ok: true, last4 });
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
