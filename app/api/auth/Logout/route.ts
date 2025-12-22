import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  // ✅ Delete cookies on the RESPONSE
  res.cookies.delete("accessToken");
  res.cookies.delete("idToken");

  // If you ever need to be extra explicit:
  // res.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
  // res.cookies.set("idToken", "", { path: "/", maxAge: 0 });

  return res;
}
