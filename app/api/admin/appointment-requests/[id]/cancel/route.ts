import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { appointments } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";

function requireAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "LMS_ADMIN";
}

const ALLOWED = new Set(["scheduled", "completed", "cancelled", "no_show"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getServerRole();
  if (!me?.sub || !requireAdmin(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = String(params.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "").trim();

  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const patch: any = { status };

  if (status === "cancelled") {
    patch.cancelledAt = new Date();
    patch.cancelledReason = typeof body?.cancelledReason === "string" ? body.cancelledReason.slice(0, 2000) : null;
  } else {
    patch.cancelledAt = null;
    patch.cancelledReason = null;
  }

  const [updated] = await db
    .update(appointments)
    .set(patch)
    .where(eq(appointments.id, id))
    .returning({
      id: appointments.id,
      status: appointments.status,
      cancelledAt: appointments.cancelledAt,
    });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, appointment: updated });
}
