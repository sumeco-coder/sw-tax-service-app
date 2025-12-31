// app/api/public/appointments/book/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { appointmentRequests, appointments } from "@/drizzle/schema";

export const runtime = "nodejs";

function clean(v: unknown, max = 300) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

function normalizeEmail(v: unknown) {
  return clean(v, 255).toLowerCase();
}

function digitsOnly(v: unknown, maxLen = 20) {
  return String(v ?? "").replace(/\D/g, "").slice(0, maxLen);
}

// Require timezone in the ISO string to avoid local/UTC mismatches.
// Accepts: 2025-01-02T10:00:00Z OR 2025-01-02T10:00:00-08:00
function hasTimezone(iso: string) {
  return /Z$|[+-]\d{2}:\d{2}$/.test(iso);
}

function parseIsoDate(iso: string) {
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// Optional: force 30-min increments (matches most schedulers)
// If you don’t want this, delete this function + its usage.
function isOn30MinGrid(dt: Date) {
  return dt.getMinutes() % 30 === 0;
}

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(255),
  phone: z.string().optional(),

  // client can send startsAt or scheduledAt (support both)
  startsAt: z.string().optional(),
  scheduledAt: z.string().optional(),

  // optional tracking
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  gclid: z.string().optional(),
  fbclid: z.string().optional(),
  landingPath: z.string().optional(),
  referrer: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const b = parsed.data;

    const name = clean(b.name, 80);
    const email = normalizeEmail(b.email);
    const phone = b.phone ? digitsOnly(b.phone, 20) : null;

    const rawDate = clean(b.startsAt ?? b.scheduledAt ?? "", 80);
    if (!rawDate) {
      return NextResponse.json(
        { error: "startsAt (or scheduledAt) is required." },
        { status: 400 }
      );
    }

    // ✅ Require timezone in the ISO string
    if (!hasTimezone(rawDate)) {
      return NextResponse.json(
        { error: "Date must include timezone (Z or ±HH:MM)." },
        { status: 400 }
      );
    }

    const dt = parseIsoDate(rawDate);
    if (!dt) {
      return NextResponse.json(
        { error: "startsAt (or scheduledAt) must be a valid ISO datetime." },
        { status: 400 }
      );
    }

    // Normalize seconds/ms to avoid mismatch comparisons
    dt.setSeconds(0, 0);

    // Optional: enforce 30-min grid
    if (!isOn30MinGrid(dt)) {
      return NextResponse.json(
        { error: "Time must be on a 30-minute boundary (e.g., 10:00, 10:30)." },
        { status: 400 }
      );
    }

    // Must be in the future (5-min buffer)
    const now = new Date();
    if (dt.getTime() < now.getTime() + 5 * 60 * 1000) {
      return NextResponse.json(
        { error: "That time must be in the future." },
        { status: 400 }
      );
    }

    // Derive referrer/landing path if not provided
    const refererHeader = req.headers.get("referer") ?? "";
    const referrer = clean(b.referrer ?? refererHeader, 500) || null;

    let landingPath = clean(b.landingPath, 300) || "";
    if (!landingPath && refererHeader) {
      try {
        landingPath = new URL(refererHeader).pathname;
      } catch {
        landingPath = "";
      }
    }

    // UTM fields
    const utmSource = clean(b.utmSource, 100) || null;
    const utmMedium = clean(b.utmMedium, 100) || null;
    const utmCampaign = clean(b.utmCampaign, 150) || null;
    const utmContent = clean(b.utmContent, 150) || null;
    const utmTerm = clean(b.utmTerm, 150) || null;
    const gclid = clean(b.gclid, 150) || null;
    const fbclid = clean(b.fbclid, 150) || null;

    // ✅ Friendly pre-checks (good UX)
    const [existingAppt] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(eq(appointments.scheduledAt, dt), eq(appointments.status, "scheduled")))
      .limit(1);

    if (existingAppt) {
      return NextResponse.json(
        { error: "That time is no longer available. Pick another slot." },
        { status: 409 }
      );
    }

    const [existingReq] = await db
      .select({ id: appointmentRequests.id, status: appointmentRequests.status })
      .from(appointmentRequests)
      .where(
        and(
          eq(appointmentRequests.scheduledAt, dt),
          inArray(appointmentRequests.status, ["requested", "confirmed"])
        )
      )
      .limit(1);

    if (existingReq) {
      return NextResponse.json(
        { error: "That time is currently held. Pick another slot." },
        { status: 409 }
      );
    }

    // ✅ Real protection: insert + catch unique index violation
    let created;
    try {
      [created] = await db
        .insert(appointmentRequests)
        .values({
          name,
          email,
          phone,
          scheduledAt: dt,
          status: "requested",

          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          gclid,
          fbclid,

          landingPath: landingPath || null,
          referrer,
        })
        .returning({
          id: appointmentRequests.id,
          status: appointmentRequests.status,
          scheduledAt: appointmentRequests.scheduledAt,
        });
    } catch (err: any) {
      // Postgres unique violation code
      if (err?.code === "23505") {
        return NextResponse.json(
          { error: "That time is currently held. Pick another slot." },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json(
      {
        ok: true,
        request: {
          id: created.id,
          status: created.status,
          startsAt: created.scheduledAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("POST /api/public/appointments/book error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
