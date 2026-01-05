// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  const names = ["accessToken", "idToken", "refreshToken"];

  for (const name of names) {
    // delete (Next helper)
    res.cookies.delete(name);

    // overwrite expired on common paths
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
    res.cookies.set(name, "", { path: "/admin", maxAge: 0 });
  }

  return res;
}
