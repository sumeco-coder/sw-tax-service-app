import { NextResponse } from "next/server";
import { and, asc, eq, gte, lt, inArray } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { appointmentSlots, appointments, appointmentRequests } from "@/drizzle/schema";

export const runtime = "nodejs";

function normalizeToMinute(d: Date) {
  const x = new Date(d);
  x.setSeconds(0, 0);
  return x;
}

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const days = clampInt(url.searchParams.get("days"), 14, 1, 31);

    const now = new Date();
    const from = normalizeToMinute(new Date(now.getTime() + 5 * 60 * 1000));
    const to = normalizeToMinute(new Date(from.getTime() + days * 24 * 60 * 60 * 1000));

    // 1) pull OPEN slot inventory
    const open = await db
      .select({ startsAt: appointmentSlots.startsAt })
      .from(appointmentSlots)
      .where(and(eq(appointmentSlots.status, "open"), gte(appointmentSlots.startsAt, from), lt(appointmentSlots.startsAt, to)))
      .orderBy(asc(appointmentSlots.startsAt))
      .limit(2000);

    if (!open.length) return NextResponse.json({ slots: [] as string[] }, { status: 200 });

    // 2) block already-held/scheduled times
    const appts = await db
      .select({ scheduledAt: appointments.scheduledAt })
      .from(appointments)
      .where(and(gte(appointments.scheduledAt, from), lt(appointments.scheduledAt, to), eq(appointments.status, "scheduled")));

    const reqs = await db
      .select({ scheduledAt: appointmentRequests.scheduledAt })
      .from(appointmentRequests)
      .where(
        and(
          gte(appointmentRequests.scheduledAt, from),
          lt(appointmentRequests.scheduledAt, to),
          inArray(appointmentRequests.status, ["requested", "confirmed"])
        )
      );

    const blocked = new Set<number>();
    for (const r of appts) blocked.add(normalizeToMinute(r.scheduledAt).getTime());
    for (const r of reqs) blocked.add(normalizeToMinute(r.scheduledAt).getTime());

    const slots = open
      .map((s) => normalizeToMinute(s.startsAt))
      .filter((d) => !blocked.has(d.getTime()))
      .map((d) => d.toISOString());

    return NextResponse.json({ slots }, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/public/appointments/slots error:", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
