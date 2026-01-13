import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { appointmentSlots } from "@/drizzle/schema";
import { and, eq, ne } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "LMS_ADMIN";
}

function normalizeToMinute(d: Date) {
  const x = new Date(d);
  x.setSeconds(0, 0);
  return x;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await getServerRole();
  if (!me?.sub || !requireAdmin(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = String(params.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [slot] = await db
    .select()
    .from(appointmentSlots)
    .where(eq(appointmentSlots.id, id))
    .limit(1);

  if (!slot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ slot });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getServerRole();
  if (!me?.sub || !requireAdmin(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = String(params.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  // allowed fields
  const statusRaw = body?.status;
  const startsAtRaw = body?.startsAt;
  const durationRaw = body?.durationMinutes;

  const patch: any = {};

  if (typeof statusRaw === "string") {
    const status = statusRaw.trim();
    if (status !== "open" && status !== "blocked") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = status;
  }

  if (typeof durationRaw !== "undefined") {
    const dm = Number(durationRaw);
    if (!Number.isFinite(dm) || dm < 15 || dm > 180) {
      return NextResponse.json(
        { error: "durationMinutes must be between 15 and 180" },
        { status: 400 }
      );
    }
    patch.durationMinutes = dm;
  }

  if (typeof startsAtRaw === "string") {
    const dt = new Date(startsAtRaw);
    if (Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
    }
    patch.startsAt = normalizeToMinute(dt);
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // optional: prevent duplicate startsAt (if you treat startsAt as unique)
  if (patch.startsAt) {
    const [conflict] = await db
      .select({ id: appointmentSlots.id })
      .from(appointmentSlots)
      .where(and(eq(appointmentSlots.startsAt, patch.startsAt), ne(appointmentSlots.id, id)))
      .limit(1);

    if (conflict) {
      return NextResponse.json({ error: "Another slot already exists at that time" }, { status: 409 });
    }
  }

  const [updated] = await db
    .update(appointmentSlots)
    .set(patch)
    .where(eq(appointmentSlots.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, slot: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getServerRole();
  if (!me?.sub || !requireAdmin(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = String(params.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(appointmentSlots).where(eq(appointmentSlots.id, id));
  return NextResponse.json({ ok: true });
}
