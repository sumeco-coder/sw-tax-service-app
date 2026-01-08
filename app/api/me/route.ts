// app/api/me/route.ts
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/getServerUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // optional but helpful for auth routes

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const me = await getServerUser();
  if (!me) return noStoreJson({ error: "Unauthorized" }, 401);
  return noStoreJson({ user: me }, 200);
}

// ✅ Allow your existing client POST to keep working
export async function POST() {
  return GET();
}
