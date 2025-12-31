// app/api/admin/appointment-requests/[id]/confirm/route.ts
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { appointmentRequests, appointments, users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeToMinute(d: Date) {
  const x = new Date(d);
  x.setSeconds(0, 0);
  return x;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ admin auth
    const me = await getServerRole();
    if (!me?.sub || me.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = String(params.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const durationMinutes =
      Number.isFinite(Number(body?.durationMinutes)) ? Math.max(15, Math.min(180, Number(body.durationMinutes))) : 30;

    const notes = typeof body?.notes === "string" ? String(body.notes).slice(0, 5000) : null;

    // get request
    const [ar] = await db
      .select({
        id: appointmentRequests.id,
        email: appointmentRequests.email,
        name: appointmentRequests.name,
        scheduledAt: appointmentRequests.scheduledAt,
        status: appointmentRequests.status,
      })
      .from(appointmentRequests)
      .where(eq(appointmentRequests.id, id))
      .limit(1);

    if (!ar) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (ar.status === "cancelled") {
      return NextResponse.json({ error: "Request is cancelled" }, { status: 409 });
    }

    // normalize time bucket (minute precision)
    const slotTime = normalizeToMinute(ar.scheduledAt);

    // If already confirmed, we can be idempotent:
    // - try to ensure appointment exists if user exists
    // - otherwise just return confirmed
    const email = normalizeEmail(ar.email);

    const [u] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // conflict check: is there already a scheduled appt at that time?
    const [existingAppt] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(eq(appointments.scheduledAt, slotTime), eq(appointments.status, "scheduled")))
      .limit(1);

    // conflict check: another request holding it (requested/confirmed), excluding this one
    const otherReq = await db
      .select({ id: appointmentRequests.id })
      .from(appointmentRequests)
      .where(
        and(
          eq(appointmentRequests.scheduledAt, slotTime),
          inArray(appointmentRequests.status, ["requested", "confirmed"])
        )
      );

    const heldByOther =
      otherReq.some((r) => r.id !== ar.id) || false;

    if (existingAppt || heldByOther) {
      return NextResponse.json(
        { error: "That slot is no longer available." },
        { status: 409 }
      );
    }

    // ✅ transaction: confirm request + optionally create appointment
    const result = await db.transaction(async (tx) => {
      // confirm request (even if user doesn't exist)
      const [updatedReq] = await tx
        .update(appointmentRequests)
        .set({ status: "confirmed" })
        .where(eq(appointmentRequests.id, ar.id))
        .returning({
          id: appointmentRequests.id,
          status: appointmentRequests.status,
          scheduledAt: appointmentRequests.scheduledAt,
          email: appointmentRequests.email,
        });

      let createdAppt: null | { id: string; scheduledAt: Date; status: any } = null;

      if (u?.id) {
        const [ins] = await tx
          .insert(appointments)
          .values({
            userId: u.id,
            scheduledAt: slotTime,
            durationMinutes,
            status: "scheduled",
            notes,
          } as any)
          .returning({
            id: appointments.id,
            scheduledAt: appointments.scheduledAt,
            status: appointments.status,
          });

        createdAppt = ins ?? null;
      }

      return { updatedReq, createdAppt, userLinked: !!u?.id };
    });

    return NextResponse.json(
      {
        ok: true,
        request: {
          id: result.updatedReq.id,
          status: result.updatedReq.status,
          startsAt: normalizeToMinute(result.updatedReq.scheduledAt).toISOString(),
          email: normalizeEmail(result.updatedReq.email),
        },
        userLinked: result.userLinked,
        appointment: result.createdAppt
          ? {
              id: result.createdAppt.id,
              startsAt: normalizeToMinute(result.createdAppt.scheduledAt).toISOString(),
              status: result.createdAppt.status,
              durationMinutes,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("PATCH /api/admin/appointment-requests/[id]/confirm error:", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
