// lib/email/resend.ts
"use server";

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not set");
}

const resend = new Resend(resendApiKey);

// If you want to override this, set RESEND_FROM_EMAIL in .env
const defaultFrom =
  process.env.RESEND_FROM_EMAIL ?? "SW Tax Service <no-reply@swtaxservice.com>";


export type ResendEmailInput = {
  to: string | string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  from?: string; // optional override, if you ever want support@... etc.
};

export async function sendResendEmail(input: ResendEmailInput) {
  const from = input.from ?? defaultFrom;

  try {
    const response = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.textBody,
      html: input.htmlBody,
    } as any);

    console.log("Resend email sent:", response);
    return response;
  } catch (err) {
    console.error("Resend sendEmail error:", err);
    throw err;
  }
}
