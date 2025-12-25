import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function scheduleEmail({
  to,
  subject,
  html,
  text,
  scheduledAt,
  oneClickUrl,
  replyTo = "support@swtaxservice.com",
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  scheduledAt: string; // "in 10 min" or ISO string
  oneClickUrl?: string; // optional
  replyTo?: string;
}) {
  return await resend.emails.send({
    from: "SW Tax Service <no-reply@swtaxservice.com>",
    to: [to],
    subject,
    html,
    text,
    replyTo,      // ✅ correct key
    scheduledAt,  // ✅ correct key

    // ✅ put headers INSIDE the payload
    headers: oneClickUrl
      ? {
          "List-Unsubscribe": `<${oneClickUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined,
  });
}
