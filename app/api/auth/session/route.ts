import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const accessToken = String(body?.accessToken ?? "");
  const idToken = String(body?.idToken ?? "");

  if (!accessToken || !idToken) {
    return NextResponse.json(
      { ok: false, message: "Missing tokens" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const secure = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };

  const res = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  // ✅ Set cookies on the RESPONSE in route handlers
  res.cookies.set("accessToken", accessToken, cookieOptions);
  res.cookies.set("idToken", idToken, cookieOptions);

  return res;
}
