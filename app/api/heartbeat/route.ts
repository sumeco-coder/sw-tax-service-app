import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { jwtVerify, createRemoteJWKSet } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Set these in your environment (Amplify/hosting env vars)
const REGION = process.env.COGNITO_REGION!;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });
    const sub = String(payload.sub || "");
    if (!sub) return NextResponse.json({ ok: false }, { status: 401 });

    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.cognitoSub, sub));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
