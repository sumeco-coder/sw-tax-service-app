"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { appointmentRequests, appointments } from "@/drizzle/schema";
import { sendAppointmentEmail } from "@/lib/email/appointments";
import { sendSms } from "@/lib/sms/sns";

export type AppointmentState = { ok: boolean; message: string };

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

/** Very light E.164 normalization (US default). Adjust if needed. */
function normalizePhoneE164(input?: string | null) {
  const raw = clean(input ?? "", 40);
  if (!raw) return null;

  if (raw.startsWith("+")) return raw; // already E.164-ish

  const d = digitsOnly(raw, 20);

  // If they type 10 digits, assume US +1
  if (d.length === 10) return `+1${d}`;

  // If 11 digits starting with 1, assume US
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;

  // Otherwise return null so we don’t send bad numbers to SNS
  return null;
}

function hasTimezone(s: string) {
  // ISO with Z or ±hh:mm
  return /Z$|[+\-]\d{2}:\d{2}$/.test(s);
}

const RequestInput = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Valid email required").max(255),

  phone: z.string().trim().optional(),

  // ✅ support both (slot picker should send startsAt ISO w/ timezone)
  startsAt: z.string().trim().optional(),
  scheduledAt: z.string().trim().optional(),

  // optional tracking fields (only saved if provided)
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

export async function requestAppointment(
  _prevState: AppointmentState,
  formData: FormData
): Promise<AppointmentState> {
  const parsed = RequestInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: (formData.get("phone") as string | null) ?? undefined,

    startsAt: (formData.get("startsAt") as string | null) ?? undefined,
    scheduledAt: (formData.get("scheduledAt") as string | null) ?? undefined,

    utmSource: (formData.get("utmSource") as string | null) ?? undefined,
    utmMedium: (formData.get("utmMedium") as string | null) ?? undefined,
    utmCampaign: (formData.get("utmCampaign") as string | null) ?? undefined,
    utmContent: (formData.get("utmContent") as string | null) ?? undefined,
    utmTerm: (formData.get("utmTerm") as string | null) ?? undefined,
    gclid: (formData.get("gclid") as string | null) ?? undefined,
    fbclid: (formData.get("fbclid") as string | null) ?? undefined,
    landingPath: (formData.get("landingPath") as string | null) ?? undefined,
    referrer: (formData.get("referrer") as string | null) ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid form",
    };
  }

  const b = parsed.data;

  // ✅ prefer startsAt (slot picker), fallback to scheduledAt
  const rawWhen = clean(b.startsAt ?? b.scheduledAt ?? "", 80);
  if (!rawWhen) return { ok: false, message: "Please select a time." };

  // IMPORTANT: datetime-local has no timezone -> reject to prevent wrong times
  // (Fix by using slot picker that posts ISO w/ timezone)
  if (!hasTimezone(rawWhen)) {
    return {
      ok: false,
      message:
        "Please pick a time from the available slots (refresh the page).",
    };
  }

  const scheduledAt = new Date(rawWhen);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, message: "Invalid date/time selected." };
  }

  // normalize seconds/ms so comparisons match exactly
  scheduledAt.setSeconds(0, 0);

  // must be in the future (5-min buffer)
  const now = new Date();
  if (scheduledAt.getTime() < now.getTime() + 5 * 60 * 1000) {
    return { ok: false, message: "That time must be in the future." };
  }

  // derive referrer/landingPath from headers if not provided
  const h = await headers();
  const refererHeader = h.get("referer") ?? "";

  const referrer = clean(b.referrer ?? refererHeader, 500) || null;

  let landingPath = clean(b.landingPath, 300) || "";
  if (!landingPath && refererHeader) {
    try {
      landingPath = new URL(refererHeader).pathname;
    } catch {
      landingPath = "";
    }
  }

  // ✅ Conflict checks (prevents double booking)
  const [existingAppt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.scheduledAt, scheduledAt), eq(appointments.status, "scheduled")))
    .limit(1);

  if (existingAppt) {
    return { ok: false, message: "That time is no longer available. Pick another slot." };
  }

  const [existingReq] = await db
    .select({ id: appointmentRequests.id })
    .from(appointmentRequests)
    .where(
      and(
        eq(appointmentRequests.scheduledAt, scheduledAt),
        inArray(appointmentRequests.status, ["requested", "confirmed"])
      )
    )
    .limit(1);

  if (existingReq) {
    return { ok: false, message: "That time is currently held. Pick another slot." };
  }

  // ✅ Insert + return id so we can pass appointmentId into email
  const [req] = await db
    .insert(appointmentRequests)
    .values({
      name: b.name,
      email: b.email,
      phone: b.phone ? digitsOnly(b.phone, 20) : null,
      scheduledAt,
      status: "requested",

      utmSource: clean(b.utmSource, 100) || null,
      utmMedium: clean(b.utmMedium, 100) || null,
      utmCampaign: clean(b.utmCampaign, 150) || null,
      utmContent: clean(b.utmContent, 150) || null,
      utmTerm: clean(b.utmTerm, 150) || null,
      gclid: clean(b.gclid, 150) || null,
      fbclid: clean(b.fbclid, 150) || null,

      landingPath: landingPath || null,
      referrer,
    })
    .returning({ id: appointmentRequests.id });

  if (!req?.id) {
    return { ok: false, message: "Could not create appointment request. Try again." };
  }

  // Email (request received / booked template — whatever your system uses)
  await sendAppointmentEmail({
    to: b.email,
    kind: "BOOKED", // keep your current expectation
    appointmentId: req.id,
    startsAt: scheduledAt,
    endsAt: new Date(scheduledAt.getTime() + 30 * 60000),
  });

  // SMS (only if valid E.164)
  const phoneE164 = normalizePhoneE164(b.phone ?? null);
  if (phoneE164) {
    await sendSms(
      phoneE164,
      `SW Tax Service: We received your appointment request for ${scheduledAt.toLocaleString()}. We’ll confirm shortly.`
    );
  }

  return {
    ok: true,
    message: "Request received! Check your email for updates.",
  };
}
