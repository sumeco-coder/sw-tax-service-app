// app/api/me/route.ts
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/getServerUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Vary: "Cookie, Authorization",
    },
  });
}

function normalizeRole(role: unknown) {
  return String(role ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_"); // LMS-ADMIN -> LMS_ADMIN
}

function isAdminRole(role: unknown) {
  const r = String(role ?? "").trim().toUpperCase().replace(/-/g, "_");
  return r === "ADMIN" || r === "SUPERADMIN" || r === "SUPPORT_AGENT";
}


export async function GET() {
  const me = await getServerUser();
  if (!me) return noStoreJson({ error: "Unauthorized" }, 401);

  return noStoreJson(
    {
      user: me, // ✅ already safe & typed from getServerUser()
      role: normalizeRole(me.role),
      isAdmin: isAdminRole(me.role),
    },
    200
  );
}

export async function POST() {
  return GET();
}
