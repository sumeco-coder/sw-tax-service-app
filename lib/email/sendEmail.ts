"use server";

import { sendSesEmail } from "./ses";
import { sendResendEmail } from "./resend";

export type SendEmailArgs = {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
};

const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

/**
 * Unified email sender for the whole app.
 *
 * - If EMAIL_PROVIDER=ses → try SES, fall back to Resend on failure
 * - Otherwise → use Resend
 */
export async function sendEmail({ to, subject, htmlBody, textBody }: SendEmailArgs) {
  if (provider === "ses") {
    try {
      await sendSesEmail({
        to,
        subject,
        htmlBody,
        textBody,
      });
      return;
    } catch (err) {
      console.error("SES send failed, falling back to Resend:", err);
      // Fall through to Resend backup
    }
  }

  // Default / fallback → Resend
  await sendResendEmail({
    to,
    subject,
    htmlBody,
    textBody,
  });
}
