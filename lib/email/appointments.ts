// lib/email/appointments.ts
import { sendEmail } from "./sendEmail";

type AppointmentEmailKind = "BOOKED" | "RESCHEDULED" | "CANCELLED";

interface AppointmentEmailParams {
  to: string;
  kind: AppointmentEmailKind;
  startsAt: Date;
  endsAt: Date;
  cancelReason?: string;
}

export async function sendAppointmentEmail(params: AppointmentEmailParams) {
  const { to, kind, startsAt, endsAt, cancelReason } = params;

  const fmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const timeWindow = `${fmt.format(startsAt)} – ${fmt.format(endsAt)}`;

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
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5;">
      <h2 style="color: #111827;">${subject}</h2>
      <p>${intro}</p>
      <p><strong>Time:</strong> ${timeWindow}</p>
      ${
        kind === "CANCELLED" && cancelReason
          ? `<p><strong>Reason:</strong> ${cancelReason}</p>`
          : ""
      }
      <p style="margin-top: 16px; font-size: 14px; color: #4B5563;">
        If you need to make changes, you can return to your onboarding portal
        and reschedule or contact support.
      </p>
      <p style="margin-top: 24px; font-size: 13px; color: #9CA3AF;">
        SW Tax Service
      </p>
    </div>
  `;

  await sendEmail({
    to,
    subject,
    htmlBody: html,
  });
}
