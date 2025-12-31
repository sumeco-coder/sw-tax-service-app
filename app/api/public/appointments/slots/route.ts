// app/api/public/appointments/slots/route.ts
import { NextResponse } from "next/server";
import { and, eq, gte, lt, inArray } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { appointments, appointmentRequests } from "@/drizzle/schema";

export const runtime = "nodejs";

function parseIso(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

// normalize a date to slot boundary (minute precision)
function normalizeToMinute(d: Date) {
  const x = new Date(d);
  x.setSeconds(0, 0);
  return x;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const slotMinutes = clampInt(url.searchParams.get("slotMinutes"), 30, 10, 120);

    // You can call like:
    // /api/public/appointments/slots?from=2026-01-05T00:00:00.000Z&to=2026-01-06T00:00:00.000Z
    const from = parseIso(url.searchParams.get("from"));
    const to = parseIso(url.searchParams.get("to"));

    if (!from || !to || to <= from) {
      return NextResponse.json(
        { error: "Provide valid ?from=ISO&to=ISO with to > from" },
        { status: 400 }
      );
    }

    // cap range for safety (31 days)
    const maxRangeMs = 31 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxRangeMs) {
      return NextResponse.json(
        { error: "Range too large (max 31 days)." },
        { status: 400 }
      );
    }

    const fromN = normalizeToMinute(from);
    const toN = normalizeToMinute(to);

    // pull blocks
    const appts = await db
      .select({ scheduledAt: appointments.scheduledAt })
      .from(appointments)
      .where(
        and(
          gte(appointments.scheduledAt, fromN),
          lt(appointments.scheduledAt, toN),
          eq(appointments.status, "scheduled")
        )
      );

    const reqs = await db
      .select({ scheduledAt: appointmentRequests.scheduledAt, status: appointmentRequests.status })
      .from(appointmentRequests)
      .where(
        and(
          gte(appointmentRequests.scheduledAt, fromN),
          lt(appointmentRequests.scheduledAt, toN),
          inArray(appointmentRequests.status, ["requested", "confirmed"])
        )
      );

    const blocked = new Set<number>();

    for (const r of appts) blocked.add(normalizeToMinute(r.scheduledAt).getTime());
    for (const r of reqs) blocked.add(normalizeToMinute(r.scheduledAt).getTime());

    // generate slots
    const stepMs = slotMinutes * 60 * 1000;
    const slots: { startsAt: string; available: boolean }[] = [];

    // start aligned to slot boundary
    let t = fromN.getTime();
    const remainder = t % stepMs;
    if (remainder !== 0) t += stepMs - remainder;

    for (; t < toN.getTime(); t += stepMs) {
      const available = !blocked.has(t);
      slots.push({ startsAt: new Date(t).toISOString(), available });
    }

    return NextResponse.json(
      {
        from: fromN.toISOString(),
        to: toN.toISOString(),
        slotMinutes,
        slots,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("GET /api/public/appointments/slots error:", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
