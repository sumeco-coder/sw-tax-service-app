// lib/email/sendEmail.ts
import { sendSesEmail } from "./ses";
import { sendResendEmail, type ResendAttachment } from "./resend";

export type EmailAttachment = {
  filename: string;
  content?: string; // base64
  path?: string; // public URL
  contentId?: string;
  contentType?: string; // optional metadata
};

export type SendEmailArgs = {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;

  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
};

// ✅ Resend-first (default)
const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

/**
 * Unified email sender for the whole app.
 *
 * Resend-first:
 * - If EMAIL_PROVIDER=resend → send with Resend, optionally fall back to SES if configured
 * - If EMAIL_PROVIDER=ses → send with SES first (only if you ever choose that)
 */
export async function sendEmail(args: SendEmailArgs): Promise<void> {
  const hasAttachments = Boolean(args.attachments?.length);

  // ✅ If attachments exist, ALWAYS use Resend (SES raw builder doesn’t attach files yet)
  if (hasAttachments) {
    const attachments: ResendAttachment[] = (args.attachments ?? []).map((a) => ({
      filename: a.filename,
      content: a.content,
      path: a.path,
      contentId: a.contentId,
    }));

    await sendResendEmail({
      to: args.to,
      subject: args.subject,
      htmlBody: args.htmlBody,
      textBody: args.textBody,
      replyTo: args.replyTo,
      headers: args.headers,
      attachments,
    });

    return;
  }

  // ✅ Resend-first behavior
  if (provider !== "ses") {
    try {
      await sendResendEmail({
        to: args.to,
        subject: args.subject,
        htmlBody: args.htmlBody,
        textBody: args.textBody,
        replyTo: args.replyTo,
        headers: args.headers,
      });
      return;
    } catch (err) {
      console.error("Resend send failed, falling back to SES:", err);
      // fallthrough to SES
    }

    // SES fallback only if SES env vars exist
    try {
      await sendSesEmail(args);
      return;
    } catch (err) {
      console.error("SES fallback failed too:", err);
      throw err;
    }
  }

  // If you ever set EMAIL_PROVIDER=ses intentionally:
  await sendSesEmail(args);
}
