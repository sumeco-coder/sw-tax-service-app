// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store", Vary: "Cookie, Authorization" } }
  );

  const names = ["accessToken", "idToken", "refreshToken"];

  for (const name of names) {
    res.cookies.delete(name);
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
    res.cookies.set(name, "", { path: "/admin", maxAge: 0 });
  }

  return res;
}
