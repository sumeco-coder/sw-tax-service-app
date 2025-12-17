"use server";

import { sendSesEmail } from "./ses";
import { sendResendEmail } from "./resend";

export type SendEmailArgs = {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;

  // ✅ NEW
  replyTo?: string;
  headers?: Record<string, string>;
};

const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

/**
 * Unified email sender for the whole app.
 *
 * - If EMAIL_PROVIDER=ses → try SES, fall back to Resend on failure
 * - Otherwise → use Resend
 */
export async function sendEmail(args: SendEmailArgs): Promise<void> {
  if (provider === "ses") {
    try {
      await sendSesEmail(args);
      return;
    } catch (err) {
      console.error("SES send failed, falling back to Resend:", err);
      // Fall through to Resend backup
    }
  }

  await sendResendEmail(args);
}
