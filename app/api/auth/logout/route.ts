// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  // ✅ Most reliable: delete + overwrite with expired cookie
  for (const name of ["accessToken", "idToken"]) {
    res.cookies.delete(name); // (name only) matches Next's types
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }

  return res;
}
