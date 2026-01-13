// app/api/admin/appointment-slots/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { appointmentSlots } from "@/drizzle/schema";
import { and, desc, gte, lte } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "LMS_ADMIN";
}

const TZ = "America/Los_Angeles";

function clampInt(v: unknown, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/** YYYY-MM-DD in a specific timezone */
function ymdInTz(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function addDaysYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)); // noon anchor avoids DST edges
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return null;
  if (y < 1970 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function normalizeToMinute(d: Date) {
  const x = new Date(d);
  x.setSeconds(0, 0);
  return x;
}

/** timezone offset helper */
function tzOffsetMs(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(date);
  const pick = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);

  const asUtc = Date.UTC(
    pick("year"),
    pick("month") - 1,
    pick("day"),
    pick("hour"),
    pick("minute"),
    pick("second")
  );

  return asUtc - date.getTime();
}

/** Convert PT wall time -> real UTC Date (DST-safe) */
function zonedTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string) {
  const baseUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const guess = new Date(baseUtcMs);
  const o1 = tzOffsetMs(guess, timeZone);

  const guess2 = new Date(baseUtcMs - o1);
  const o2 = tzOffsetMs(guess2, timeZone);

  const out = new Date(baseUtcMs - o2);
  out.setSeconds(0, 0);
  return out;
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
    .limit(500);

  return NextResponse.json({ slots: rows });
}

export async function POST(req: Request) {
  const me = await getServerRole();
  if (!me?.sub || !requireAdmin(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: any = await req.json().catch(() => ({}));

  // ✅ Mode 1: single slot
  if (typeof body?.startsAt === "string") {
    const dt = normalizeToMinute(new Date(body.startsAt));
    if (Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
    }

    const [created] = await db
      .insert(appointmentSlots)
      .values({ startsAt: dt, status: "open", durationMinutes: 30 } as any)
      .returning();

    return NextResponse.json({ ok: true, slot: created ?? null }, { status: 201 });
  }

  // ✅ Mode 2: bulk generator (OR empty body => defaults)
  const todayYmd = ymdInTz(new Date(), TZ);

  const startDate = String(body.startDate ?? todayYmd).slice(0, 10);
  const endDate = String(body.endDate ?? addDaysYmd(todayYmd, 14)).slice(0, 10);

  const startHour = clampInt(body.startHour, 9, 0, 23);
  const endHour = clampInt(body.endHour, 17, 1, 24);
  const intervalMinutes = clampInt(body.intervalMinutes, 30, 10, 180);

  const daysOfWeek: number[] = Array.isArray(body.daysOfWeek)
    ? body.daysOfWeek
        .map((n: any) => Number(n))
        .filter((n: any) => Number.isFinite(n) && n >= 0 && n <= 6)
    : [1, 2, 3, 4, 5]; // Mon–Fri

  if (!daysOfWeek.length) {
    return NextResponse.json({ error: "daysOfWeek cannot be empty" }, { status: 400 });
  }

  const s = parseYmd(startDate);
  const e = parseYmd(endDate);
  if (!s || !e) {
    return NextResponse.json({ error: "Invalid date format (YYYY-MM-DD)" }, { status: 400 });
  }

  // validate range
  const startNoon = new Date(Date.UTC(s.y, s.m - 1, s.d, 12, 0, 0, 0));
  const endNoon = new Date(Date.UTC(e.y, e.m - 1, e.d, 12, 0, 0, 0));
  if (endNoon < startNoon) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  if (endHour <= startHour) {
    return NextResponse.json({ error: "endHour must be greater than startHour" }, { status: 400 });
  }

  // preload existing startsAt within range to skip duplicates
  const rangeStartUtc = zonedTimeToUtc(s.y, s.m, s.d, 0, 0, TZ);
  const rangeEndUtc = zonedTimeToUtc(e.y, e.m, e.d, 23, 59, TZ);

  const existing = await db
    .select({ startsAt: appointmentSlots.startsAt })
    .from(appointmentSlots)
    .where(and(gte(appointmentSlots.startsAt, rangeStartUtc), lte(appointmentSlots.startsAt, rangeEndUtc)));

  const existingSet = new Set(existing.map((r) => normalizeToMinute(r.startsAt).getTime()));

  const values: any[] = [];
  let skipped = 0;

  for (let d = new Date(startNoon); d <= endNoon; d.setUTCDate(d.getUTCDate() + 1)) {
    const ymd = ymdInTz(d, TZ);
    const p = parseYmd(ymd);
    if (!p) continue;

    // PT day-of-week (use PT noon => UTCDay matches PT day)
    const ptNoonUtc = zonedTimeToUtc(p.y, p.m, p.d, 12, 0, TZ);
    const dow = ptNoonUtc.getUTCDay();
    if (!daysOfWeek.includes(dow)) continue;

    // generate slots across the day by minutes
    const dayStartMin = startHour * 60;
    const dayEndMin = endHour * 60;

    for (let mins = dayStartMin; mins < dayEndMin; mins += intervalMinutes) {
      const hh = Math.floor(mins / 60);
      const mm = mins % 60;

      const slotUtc = zonedTimeToUtc(p.y, p.m, p.d, hh, mm, TZ);
      const key = slotUtc.getTime();

      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      existingSet.add(key);
      values.push({
        startsAt: slotUtc,
        durationMinutes: intervalMinutes,
        status: "open",
      });

      if (values.length >= 5000) break;
    }

    if (values.length >= 5000) break;
  }

  if (!values.length) {
    return NextResponse.json({ error: "No slots generated (all duplicates or no matching days)" }, { status: 400 });
  }

  await db.insert(appointmentSlots).values(values as any);

  return NextResponse.json(
    { ok: true, inserted: values.length, skipped },
    { status: 201 }
  );
}
