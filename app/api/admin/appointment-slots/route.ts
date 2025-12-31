import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { appointmentSlots } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAdmin(role: string | null | undefined) {
  return role === "admin" || role === "lms-admin";
}

export async function GET() {
  const me = await getServerRole();
  if (!me?.sub || !requireAdmin(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(appointmentSlots)
    .orderBy(desc(appointmentSlots.startsAt))
    .limit(300);

  return NextResponse.json({ slots: rows });
}

export async function POST(req: Request) {
  const me = await getServerRole();
  if (!me?.sub || !requireAdmin(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  // Two modes:
  // 1) single: { startsAt: ISO string }
  // 2) bulk: { startDate, endDate, startHour, endHour, intervalMinutes, daysOfWeek }
  if (typeof body?.startsAt === "string") {
    const dt = new Date(body.startsAt);
    if (Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
    }

    const [created] = await db
      .insert(appointmentSlots)
      .values({ startsAt: dt, status: "open", durationMinutes: 30 } as any)
      // if you have drizzle .onConflictDoNothing available:
      // .onConflictDoNothing({ target: appointmentSlots.startsAt })
      .returning();

    return NextResponse.json({ ok: true, slot: created ?? null });
  }

  // bulk generator defaults
  const startDate = String(body.startDate ?? "").slice(0, 10); // YYYY-MM-DD
  const endDate = String(body.endDate ?? "").slice(0, 10);
  const startHour = Number(body.startHour ?? 9);
  const endHour = Number(body.endHour ?? 17);
  const intervalMinutes = Number(body.intervalMinutes ?? 30);
  const daysOfWeek: number[] = Array.isArray(body.daysOfWeek)
    ? body.daysOfWeek.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n))
    : [1, 2, 3, 4, 5]; // Mon–Fri

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const values: any[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(); // 0 Sun .. 6 Sat
    if (!daysOfWeek.includes(day)) continue;

    for (let h = startHour; h < endHour; ) {
      const dt = new Date(d);
      dt.setHours(h, 0, 0, 0);

      // step by interval minutes
      for (let m = 0; m < 60 && h < endHour; m += intervalMinutes) {
        const slot = new Date(dt);
        slot.setMinutes(m);

        // stop if beyond endHour
        if (slot.getHours() >= endHour) break;

        values.push({
          startsAt: slot,
          durationMinutes: intervalMinutes,
          status: "open",
        });

        if (values.length >= 5000) break;
      }

      h += 1;
      if (values.length >= 5000) break;
    }
    if (values.length >= 5000) break;
  }

  if (!values.length) {
    return NextResponse.json({ error: "No slots generated" }, { status: 400 });
  }

  await db.insert(appointmentSlots).values(values as any);
  return NextResponse.json({ ok: true, inserted: values.length });
}
