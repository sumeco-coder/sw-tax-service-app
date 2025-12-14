// lib/email/resend.ts
// lib/email/resend.ts
import "server-only";
import { Resend } from "resend";

const defaultFrom =
  process.env.RESEND_FROM_EMAIL ?? "SW Tax Service <no-reply@swtaxservice.com>";

export type ResendEmailInput = {
  to: string | string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  from?: string;
};

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

export async function sendResendEmail(input: ResendEmailInput) {
  const resend = getResendClient();
  const from = input.from ?? defaultFrom;

  return await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.textBody,
    html: input.htmlBody,
  } as any);
}
