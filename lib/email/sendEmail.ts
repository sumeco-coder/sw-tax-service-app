// lib/email/sendEmail.ts
import "server-only";

import { sendResendEmail, type ResendAttachment } from "./resend.server";

export type EmailAttachment = {
  filename: string;
  content?: string; // base64 (for Resend attachments)
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

export async function sendEmail(args: SendEmailArgs): Promise<void> {
  const provider = getProvider();

  const hasAttachments = Boolean(args.attachments?.length);
  const isScheduled = Boolean(args.scheduledAt);

  // ✅ Resend-only cases (attachments + scheduling are Resend features here)
  if (hasAttachments || isScheduled) {
    const attachments: ResendAttachment[] = (args.attachments ?? []).map((a) => ({
      filename: a.filename,
      ...(a.content ? { content: a.content } : {}),
      ...(a.path ? { path: a.path } : {}),
      ...(a.contentId ? { contentId: a.contentId } : {}),
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

  // ✅ SES is ONLY used when you explicitly opt-in.
  // Lazy import prevents SES module from loading in Resend mode.
  if (provider === "ses") {
    const { sendSesEmail } = await import("./ses");
    await sendSesEmail(args);
    return;
  }

  // ✅ Default: Resend only (NO SES fallback)
  await sendResendEmail({
    to: args.to,
    subject: args.subject,
    htmlBody: args.htmlBody,
    textBody: args.textBody,
    replyTo: args.replyTo,
    headers: args.headers,
  });
}
