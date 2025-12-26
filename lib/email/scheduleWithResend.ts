// lib/email/scheduleEmail.ts
import "server-only";
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(key);
  return _resend;
}

const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL ?? "SW Tax Service <no-reply@swtaxservice.com>";

export async function scheduleEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  scheduledAt: string; // ISO string or "in 10 min"
  oneClickUrl?: string; // optional https URL
  replyTo?: string;
  unsubscribeEmail?: string; // optional mailto target
}) {
  const resend = getResend();

  const {
    to,
    subject,
    html,
    text,
    scheduledAt,
    oneClickUrl,
    replyTo = "support@swtaxservice.com",
    unsubscribeEmail = "unsubscribe@swtaxservice.com",
  } = opts;

  // Build List-Unsubscribe header(s)
  // Many providers prefer both mailto + https.
  const listUnsubParts: string[] = [];
  if (unsubscribeEmail) listUnsubParts.push(`<mailto:${unsubscribeEmail}>`);
  if (oneClickUrl) listUnsubParts.push(`<${oneClickUrl}>`);

  const headers =
    listUnsubParts.length > 0
      ? {
          "List-Unsubscribe": listUnsubParts.join(", "),
          ...(oneClickUrl ? { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {}),
        }
      : undefined;

  return await resend.emails.send({
    from: DEFAULT_FROM,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
    replyTo,
    scheduledAt,
    ...(headers ? { headers } : {}),
  } as any);
}
