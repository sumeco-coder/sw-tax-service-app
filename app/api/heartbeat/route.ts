// app/api/heartbeat/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REGION = process.env.COGNITO_REGION!;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

function getToken(req: NextRequest) {
  const cookieToken =
    req.cookies.get("accessToken")?.value ||
    req.cookies.get("idToken")?.value;

  if (cookieToken) return cookieToken;

  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export async function POST(req: NextRequest) {
  const token = getToken(req);

  if (!token) {
    return NextResponse.json({ ok: true, authenticated: false }, { status: 200 });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });

    const sub = String(payload.sub || "");
    if (!sub) {
      return NextResponse.json({ ok: true, authenticated: false }, { status: 200 });
    }

    // ✅ Throttle DB writes: only update if lastSeenAt is null or older than 30s
    await db.execute(sql`
      update ${users}
      set ${users.lastSeenAt} = now()
      where ${users.cognitoSub} = ${sub}
        and (
          ${users.lastSeenAt} is null
          or ${users.lastSeenAt} < now() - interval '30 seconds'
        )
    `);

    return NextResponse.json({ ok: true, authenticated: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true, authenticated: false }, { status: 200 });
  }
}
