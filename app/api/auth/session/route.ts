// app/api/auth/session/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const secure = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };

  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

  res.cookies.set("accessToken", accessToken, cookieOptions);
  res.cookies.set("idToken", idToken, cookieOptions);

  return res;
}
