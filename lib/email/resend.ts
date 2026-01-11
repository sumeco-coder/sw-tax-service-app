// lib/email/resend.ts
import "server-only";
import { Resend } from "resend";

const defaultFrom =
  process.env.RESEND_FROM_EMAIL ?? "SW Tax Service <no-reply@swtaxservice.com>";

export type ResendAttachment = {
  filename: string;
  content?: string; // base64
  path?: string; // public URL
  contentId?: string; // inline cid
};

export type ResendEmailInput = {
  to: string | string[];
  subject: string;

  // content
  textBody?: string;
  htmlBody?: string;

  // headers/meta
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: ResendAttachment[];

  // scheduling
  scheduledAt?: string; // ISO or "in 10 min" (Resend supports)
};

let _resend: Resend | null = null;

function getResendClient() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(key);
  return _resend;
}

function mapAttachments(input?: ResendAttachment[]) {
  if (!input?.length) return undefined;

  return input.map((a) => ({
    filename: a.filename,
    ...(a.content ? { content: a.content } : {}),
    ...(a.path ? { path: a.path } : {}),
    ...(a.contentId ? { contentId: a.contentId } : {}),
  }));
}

export async function sendResendEmail(input: ResendEmailInput) {
  const resend = getResendClient();

  const html = input.htmlBody?.trim();
  const text = input.textBody?.trim();

  if (!html && !text) {
    throw new Error("sendResendEmail requires htmlBody or textBody.");
  }

  const payload = {
    from: input.from ?? defaultFrom,
    to: input.to,
    subject: input.subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    ...(input.headers ? { headers: input.headers } : {}),
    ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    ...(input.attachments?.length
      ? { attachments: mapAttachments(input.attachments) }
      : {}),
  };

  const result = await resend.emails.send(payload as any);

  if ((result as any)?.error) {
    throw new Error(`Resend send failed: ${(result as any).error.message}`);
  }

  return result;
}
