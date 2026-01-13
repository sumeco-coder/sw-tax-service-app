import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, ilike, lt, lte, gt, or } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { getServerRole } from "@/lib/auth/roleServer";
import { users, appointments, appointmentRequests, appointmentSlots } from "@/drizzle/schema";

import AppointmentAdminClient from "./ui/AppointmentAdminClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type View = "requests" | "appointments" | "slots";
type Segment = "upcoming" | "today" | "past" | "cancelled" | "all";
type SP = { view?: View; segment?: Segment; q?: string };

function requireAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "LMS_ADMIN";
}

const TZ = "America/Los_Angeles";

function getPtYmd(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "01");
  const d = Number(parts.find((p) => p.type === "day")?.value ?? "01");
  return { y, m, d };
}

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

// Convert PT wall time -> UTC Date (DST-safe)
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

function ptTodayRangeUtc(now = new Date()) {
  const { y, m, d } = getPtYmd(now);
  const start = zonedTimeToUtc(y, m, d, 0, 0, TZ);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const me = await getServerRole();
  if (!me?.sub || !requireAdmin(me.role)) redirect("/not-authorized");

  const sp = await searchParams;
  const view: View = (sp.view ?? "requests") as View;
  const segment: Segment = (sp.segment ?? "upcoming") as Segment;
  const q = (sp.q ?? "").trim();

  // --- SLOTS
  let slots: Array<{
    id: string;
    startsAtIso: string;
    durationMinutes: number;
    status: "open" | "blocked";
  }> = [];

  if (view === "slots") {
    const rows = await db
      .select({
        id: appointmentSlots.id,
        startsAt: appointmentSlots.startsAt,
        durationMinutes: appointmentSlots.durationMinutes,
        status: appointmentSlots.status,
      })
      .from(appointmentSlots)
      .orderBy(asc(appointmentSlots.startsAt))
      .limit(500);

    slots = rows.map((s) => ({
      id: s.id,
      startsAtIso: s.startsAt.toISOString(),
      durationMinutes: s.durationMinutes,
      status: s.status as any,
    }));
  }

  // --- REQUESTS
  let requests: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    scheduledAtIso: string;
    createdAtIso: string;
    status: string;
  }> = [];

  if (view === "requests") {
    const whereExpr =
      q
        ? or(
            ilike(appointmentRequests.name, `%${q}%`),
            ilike(appointmentRequests.email, `%${q}%`),
            ilike(appointmentRequests.phone, `%${q}%`)
          )
        : undefined;

    const base = db
      .select({
        id: appointmentRequests.id,
        name: appointmentRequests.name,
        email: appointmentRequests.email,
        phone: appointmentRequests.phone,
        scheduledAt: appointmentRequests.scheduledAt,
        createdAt: appointmentRequests.createdAt,
        status: appointmentRequests.status,
      })
      .from(appointmentRequests);

    const q1 = whereExpr ? base.where(whereExpr) : base;

    const rows = await q1
      .orderBy(desc(appointmentRequests.createdAt))
      .limit(300);

    requests = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      scheduledAtIso: r.scheduledAt.toISOString(),
      createdAtIso: r.createdAt.toISOString(),
      status: String(r.status),
    }));
  }

  // --- APPOINTMENTS
  let appts: Array<{
    id: string;
    scheduledAtIso: string;
    durationMinutes: number;
    status: "scheduled" | "completed" | "cancelled" | "no_show";
    notes: string | null;
    cancelledReason: string | null;
    cancelledAtIso: string | null;
    userName: string | null;
    userEmail: string | null;
  }> = [];

  if (view === "appointments") {
    const now = new Date();
    const { start: todayStart, end: todayEnd } = ptTodayRangeUtc(now);

    const segWhere =
      segment === "all"
        ? undefined
        : segment === "cancelled"
        ? eq(appointments.status, "cancelled")
        : segment === "past"
        ? lt(appointments.scheduledAt, now)
        : segment === "today"
        ? and(
            eq(appointments.status, "scheduled"),
            gte(appointments.scheduledAt, todayStart),
            lte(appointments.scheduledAt, todayEnd)
          )
        : and(eq(appointments.status, "scheduled"), gt(appointments.scheduledAt, now)); // upcoming

    const searchWhere =
      q ? or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`)) : undefined;

    const whereExpr = and(segWhere, searchWhere);

    const base = db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        notes: appointments.notes,
        cancelledReason: appointments.cancelledReason,
        cancelledAt: appointments.cancelledAt,

        userName: users.name,
        userEmail: users.email,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.userId, users.id));

    const q1 = whereExpr ? base.where(whereExpr) : base;

    const rows = await q1
      .orderBy(asc(appointments.scheduledAt))
      .limit(300);

    appts = rows.map((a) => ({
      id: a.id,
      scheduledAtIso: a.scheduledAt.toISOString(),
      durationMinutes: a.durationMinutes,
      status: a.status as any,
      notes: a.notes,
      cancelledReason: a.cancelledReason,
      cancelledAtIso: a.cancelledAt ? a.cancelledAt.toISOString() : null,
      userName: a.userName ?? null,
      userEmail: a.userEmail ?? null,
    }));
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Appointments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Admin: Slots • Requests • Appointments (Pacific Time)
      </p>

      <AppointmentAdminClient
        view={view}
        segment={segment}
        q={q}
        slots={slots}
        requests={requests}
        appts={appts}
      />
    </div>
  );
}
