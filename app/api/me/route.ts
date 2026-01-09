// app/api/me/route.ts
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/getServerUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isAdminRole(role: unknown) {
  const r = String(role ?? "").toUpperCase();
  return r === "ADMIN" || r === "SUPERADMIN";
}

export async function GET() {
  const me = await getServerUser();
  if (!me) return noStoreJson({ error: "Unauthorized" }, 401);

  return noStoreJson(
    {
      user: me,
      // helpful flags for UI gating
      isAdmin: isAdminRole(me.role),
    },
    200
  );
}

// ✅ keep your existing client POST working
export async function POST() {
  return GET();
}
