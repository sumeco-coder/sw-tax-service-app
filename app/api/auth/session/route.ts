// app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function looksLikeJwt(t: string) {
  return t.split(".").length === 3;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const accessToken = String(body?.accessToken ?? "");
  const idToken = String(body?.idToken ?? "");

  if (!accessToken || !idToken || !looksLikeJwt(accessToken) || !looksLikeJwt(idToken)) {
    return NextResponse.json(
      { ok: false, message: "Missing/invalid tokens" },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          Vary: "Cookie, Authorization",
        },
      }
    );
  }

  // ✅ Decode sub from idToken
  let sub = "";
  try {
    sub = String((decodeJwt(idToken) as any)?.sub ?? "");
  } catch {
    sub = "";
  }

  // ✅ Source of truth: DB onboardingStep
  let onboardingComplete = false;
  if (sub) {
    const row = await db
      .select({ step: users.onboardingStep })
      .from(users)
      .where(eq(users.cognitoSub, sub))
      .limit(1);

    onboardingComplete = row[0]?.step === "DONE";
  }

  const secure = process.env.NODE_ENV === "production";
  const prodDomain = secure ? (process.env.COOKIE_DOMAIN ?? ".swtaxservice.com") : undefined;

  const baseCookie = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };

  const res = NextResponse.json(
    { ok: true, onboardingComplete },
    {
      headers: {
        "Cache-Control": "no-store",
        Vary: "Cookie, Authorization",
      },
    }
  );

  // 1) Host-only cookies (swtaxservice.com)
  res.cookies.set("accessToken", accessToken, baseCookie);
  res.cookies.set("idToken", idToken, baseCookie);
  res.cookies.set("onboardingComplete", onboardingComplete ? "true" : "false", baseCookie);

  // 2) Domain cookies (.swtaxservice.com) — covers www + subdomains
  if (prodDomain) {
    res.cookies.set("accessToken", accessToken, { ...baseCookie, domain: prodDomain });
    res.cookies.set("idToken", idToken, { ...baseCookie, domain: prodDomain });
    res.cookies.set("onboardingComplete", onboardingComplete ? "true" : "false", {
      ...baseCookie,
      domain: prodDomain,
    });
  }

  return res;
}
