// app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { decodeJwt } from "jose";

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
          "Vary": "Cookie, Authorization",
        },
      }
    );
  }

  // ✅ derive onboardingComplete from the id token payload
  const idPayload = decodeJwt(idToken) as Record<string, any>;
  const onboardingComplete =
    String(idPayload?.["custom:onboardingComplete"] ?? "").toLowerCase() === "true";

  const secure = process.env.NODE_ENV === "production";

  const domain =
    secure ? (process.env.COOKIE_DOMAIN ?? ".swtaxservice.com") : undefined;

  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    ...(domain ? { domain } : {}),
  };

  const res = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Vary": "Cookie, Authorization",
      },
    }
  );

  res.cookies.set("accessToken", accessToken, cookieOptions);
  res.cookies.set("idToken", idToken, cookieOptions);

  // ✅ this is what your middleware is looking for
  res.cookies.set(
    "onboardingComplete",
    onboardingComplete ? "true" : "false",
    cookieOptions
  );

  return res;
}
