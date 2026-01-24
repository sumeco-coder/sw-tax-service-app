import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { jwtVerify, createRemoteJWKSet } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REGION = process.env.COGNITO_REGION!;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

function getToken(req: NextRequest) {
  // 1) Cookie tokens (your app style)
  const cookieToken =
    req.cookies.get("accessToken")?.value ||
    req.cookies.get("idToken")?.value;

  if (cookieToken) return cookieToken;

  // 2) Optional Bearer token support
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export async function POST(req: NextRequest) {
  const token = getToken(req);

  if (!token) {
    // If heartbeat is called when logged out, return 200 (don’t spam 401s)
    return NextResponse.json({ ok: true, authenticated: false }, { status: 200 });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });

    const sub = String(payload.sub || "");
    if (!sub) {
      return NextResponse.json({ ok: true, authenticated: false }, { status: 200 });
    }

    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.cognitoSub, sub));

    return NextResponse.json({ ok: true, authenticated: true });
  } catch {
    // Token invalid/expired -> treat as logged out
    return NextResponse.json({ ok: true, authenticated: false }, { status: 200 });
  }
}
