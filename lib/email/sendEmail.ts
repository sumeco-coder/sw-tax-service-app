// lib/email/sendEmail.ts
import "server-only";

import { sendSesEmail } from "./ses";
import { sendResendEmail, type ResendAttachment } from "./resend";

export type EmailAttachment = {
  filename: string;
  content?: string; // base64
  path?: string; // public URL
  contentId?: string;
  contentType?: string; // optional metadata (Resend ignores)
};

export type SendEmailArgs = {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;

  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];

  // Resend scheduling (ISO string or "in 10 min")
  scheduledAt?: string;
};

function getProvider() {
  return (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
}

function hasSesConfig() {
  // adjust to whatever your SES module requires
  return Boolean(process.env.AWS_REGION); // + any other SES envs you use
}

export async function sendEmail(args: SendEmailArgs): Promise<void> {
  const provider = getProvider();

  const hasAttachments = Boolean(args.attachments?.length);
  const isScheduled = Boolean(args.scheduledAt);

  // ✅ Resend-only cases (NO fallback)
  if (hasAttachments || isScheduled) {
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
      attachments: attachments.length ? attachments : undefined,
      scheduledAt: args.scheduledAt,
    });

    return;
  }

  // ✅ If you explicitly choose SES
  if (provider === "ses") {
    await sendSesEmail(args);
    return;
  }

  // ✅ Default: Resend first, fallback to SES only for immediate sends
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
    console.error("Resend send failed:", err);
  }

  if (hasSesConfig()) {
    try {
      await sendSesEmail(args);
      return;
    } catch (err) {
      console.error("SES fallback failed too:", err);
      throw err;
    }
  }

  // no SES configured
  throw new Error("Email send failed (Resend failed and SES is not configured).");
}
