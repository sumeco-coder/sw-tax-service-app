// lib/email/appointments.ts
// lib/email/appointments.ts
import "server-only";

import { sendEmail } from "./sendEmail";

type AppointmentEmailKind = "BOOKED" | "RESCHEDULED" | "CANCELLED";

export interface AppointmentEmailParams {
  to: string;
  kind: AppointmentEmailKind;
  appointmentId: string; // ✅ stable id (db id)
  startsAt: Date;
  endsAt: Date;
  cancelReason?: string;
}

const APPT_TZ = "America/Los_Angeles"; // ✅ timezone lock for display

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
    year: "numeric",
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
  return `${dateStr} • ${startTime} – ${endTime} ${tz}`.trim();
}

function toIcsUtc(d: Date) {
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
  return String(text ?? "")
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
  isCancelled?: boolean;
  sequence?: number;
}) {
  const dtstamp = toIcsUtc(new Date());
  const dtstart = toIcsUtc(params.startsAt);
  const dtend = toIcsUtc(params.endsAt);

  const method = params.isCancelled ? "CANCEL" : "REQUEST";
  const status = params.isCancelled ? "CANCELLED" : "CONFIRMED";
  const sequence = Number.isFinite(params.sequence) ? String(params.sequence) : "0";

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
    `STATUS:${status}`,
    `SEQUENCE:${sequence}`,
    params.organizerEmail
      ? `ORGANIZER;CN=${icsEscape(params.organizerName ?? "SW Tax Service")}:mailto:${icsEscape(
          params.organizerEmail
        )}`
      : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export async function sendAppointmentEmail(params: AppointmentEmailParams) {
  const { to, kind, startsAt, endsAt, cancelReason, appointmentId } = params;

  const timeWindow = formatAppointmentWindow(startsAt, endsAt);

  const subject =
    kind === "BOOKED"
      ? "Your SW Tax Service appointment is booked"
      : kind === "RESCHEDULED"
      ? "Your SW Tax Service appointment was rescheduled"
      : "Your SW Tax Service appointment was cancelled";

  const intro =
    kind === "BOOKED"
      ? "Thank you for scheduling your tax review appointment with SW Tax Service."
      : kind === "RESCHEDULED"
      ? "Your SW Tax Service appointment has been successfully rescheduled."
      : "Your SW Tax Service appointment has been cancelled.";

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

  // ✅ Stable UID so reschedule/cancel updates the same event
  const uid = `${appointmentId}@swtaxservice.com`;

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
    isCancelled: kind === "CANCELLED",
    organizerName: "SW Tax Service",
    organizerEmail: "support@swtaxservice.com",
    sequence: kind === "RESCHEDULED" ? 1 : 0,
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
