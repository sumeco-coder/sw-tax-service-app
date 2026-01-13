import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { appointmentSlots } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "LMS_ADMIN";
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getServerRole();
  if (!me?.sub || !requireAdmin(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = String(params.id ?? "").trim();
  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "").trim();

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (status !== "open" && status !== "blocked") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await db.update(appointmentSlots).set({ status: status as any }).where(eq(appointmentSlots.id, id));
  return NextResponse.json({ ok: true });
}
