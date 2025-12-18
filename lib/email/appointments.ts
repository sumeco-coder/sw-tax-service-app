// lib/email/appointments.ts
import { sendEmail } from "./sendEmail";
import { randomUUID } from "crypto";

type AppointmentEmailKind = "BOOKED" | "RESCHEDULED" | "CANCELLED";

interface AppointmentEmailParams {
  to: string;
  kind: AppointmentEmailKind;
  startsAt: Date;
  endsAt: Date;
  cancelReason?: string;
}

const APPT_TZ = "America/Los_Angeles"; // ✅ timezone lock

function getTzAbbrev(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
    hour: "numeric",
  }).formatToParts(d);

  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

function formatAppointmentWindow(startsAt: Date, endsAt: Date) {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric", // ✅ include year
    timeZone: APPT_TZ,
  }).format(startsAt);

  const startTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: APPT_TZ,
  }).format(startsAt);

  const endTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: APPT_TZ,
  }).format(endsAt);

  const tz = getTzAbbrev(startsAt, APPT_TZ);

  // ✅ clean formatting
  return `${dateStr} • ${startTime} – ${endTime} ${tz}`.trim();
}

function toIcsUtc(d: Date) {
  // YYYYMMDDTHHMMSSZ
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function icsEscape(text: string) {
  // escape for ICS: backslash, comma, semicolon, newline
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

function buildIcs(params: {
  uid: string;
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  organizerName?: string;
  organizerEmail?: string;
}) {
  const dtstamp = toIcsUtc(new Date());
  const dtstart = toIcsUtc(params.startsAt);
  const dtend = toIcsUtc(params.endsAt);

  // METHOD:REQUEST works for “booked/rescheduled”
  // For cancelled, METHOD:CANCEL is better so calendars remove it
  const method =
    params.summary.toLowerCase().includes("cancelled") ? "CANCEL" : "REQUEST";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SW Tax Service//Appointments//EN",
    `METHOD:${method}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${icsEscape(params.uid)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${icsEscape(params.summary)}`,
    `DESCRIPTION:${icsEscape(params.description)}`,
    // Optional organizer (leave blank if you don't want it)
    params.organizerEmail
      ? `ORGANIZER;CN=${icsEscape(params.organizerName ?? "SW Tax Service")}:mailto:${icsEscape(params.organizerEmail)}`
      : null,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export async function sendAppointmentEmail(params: AppointmentEmailParams) {
  const { to, kind, startsAt, endsAt, cancelReason } = params;

  const timeWindow = formatAppointmentWindow(startsAt, endsAt);

  let subject = "";
  let intro = "";

  if (kind === "BOOKED") {
    subject = "Your SW Tax Service appointment is booked";
    intro = "Thank you for scheduling your tax review appointment with SW Tax Service.";
  } else if (kind === "RESCHEDULED") {
    subject = "Your SW Tax Service appointment was rescheduled";
    intro = "Your SW Tax Service appointment has been successfully rescheduled.";
  } else {
    subject = "Your SW Tax Service appointment was cancelled";
    intro = "Your SW Tax Service appointment has been cancelled.";
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
      <h2 style="color:#111827; margin:0 0 8px;">${subject}</h2>
      <p style="margin:0 0 12px;">${intro}</p>

      <div style="padding:12px 14px; border:1px solid #E5E7EB; border-radius:12px; background:#F9FAFB;">
        <p style="margin:0;"><strong>When (PT):</strong> ${timeWindow}</p>
        ${
          kind === "CANCELLED" && cancelReason
            ? `<p style="margin:8px 0 0;"><strong>Reason:</strong> ${cancelReason}</p>`
            : ""
        }
      </div>

      <p style="margin-top:14px; font-size:14px; color:#4B5563;">
        You can return to your portal to reschedule if needed.
      </p>

      <p style="margin-top:22px; font-size:13px; color:#9CA3AF;">SW Tax Service</p>
    </div>
  `;

  const text = [
    subject,
    "",
    intro,
    "",
    `When (PT): ${timeWindow}`,
    kind === "CANCELLED" && cancelReason ? `Reason: ${cancelReason}` : "",
    "",
    "You can return to your portal to reschedule if needed.",
    "",
    "SW Tax Service",
  ]
    .filter(Boolean)
    .join("\n");

  // ✅ Calendar invite (.ics)
  const uid = `${randomUUID()}@swtaxservice.com`;
  const icsSummary =
    kind === "CANCELLED"
      ? "SW Tax Service Appointment (Cancelled)"
      : "SW Tax Service Appointment";

  const icsDescription =
    kind === "CANCELLED"
      ? `Your appointment was cancelled.${cancelReason ? ` Reason: ${cancelReason}` : ""}`
      : "Your SW Tax Service appointment is scheduled. If you need changes, return to your portal.";

  const ics = buildIcs({
    uid,
    summary: icsSummary,
    description: icsDescription,
    startsAt,
    endsAt,
    // Optional — set this if you want it to show as organizer
    // organizerName: "SW Tax Service",
    // organizerEmail: "support@swtaxservice.com",
  });

  await sendEmail({
    to,
    subject,
    htmlBody: html,
    textBody: text,
    attachments: [
      {
        filename: "SW-Tax-Service-Appointment.ics",
        content: ics,
        contentType: "text/calendar; charset=utf-8",
      },
    ],
  });
}
