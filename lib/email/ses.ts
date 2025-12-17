"use server";

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";
import type { SendEmailArgs } from "./sendEmail";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function safeHeaderValue(v: string) {
  // Prevent header injection (strip CR/LF)
  return String(v).replace(/[\r\n]+/g, " ").trim();
}

function encodeMimeWord(s: string) {
  // RFC 2047 (simple UTF-8 Base64)
  const b64 = Buffer.from(s, "utf8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

function buildRawMimeEmail(args: {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}) {
  const boundary = `----=_Part_${Math.random().toString(16).slice(2)}`;
  const crlf = "\r\n";

  const lines: string[] = [];

  lines.push(`From: ${args.from}`);
  lines.push(`To: ${args.to}`);
  lines.push(`Subject: ${encodeMimeWord(args.subject)}`);
  lines.push(`MIME-Version: 1.0`);

  if (args.replyTo) {
    lines.push(`Reply-To: ${safeHeaderValue(args.replyTo)}`);
  }

  if (args.headers) {
    for (const [k, v] of Object.entries(args.headers)) {
      if (!k) continue;
      lines.push(`${safeHeaderValue(k)}: ${safeHeaderValue(v)}`);
    }
  }

  lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  lines.push(""); // blank line between headers and body

  // text/plain part
  const text = args.textBody ?? "";
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: text/plain; charset="UTF-8"`);
  lines.push(`Content-Transfer-Encoding: 7bit`);
  lines.push("");
  lines.push(text);
  lines.push("");

  // text/html part
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: text/html; charset="UTF-8"`);
  lines.push(`Content-Transfer-Encoding: 7bit`);
  lines.push("");
  lines.push(args.htmlBody);
  lines.push("");

  // end
  lines.push(`--${boundary}--`);
  lines.push("");

  return lines.join(crlf);
}

export async function sendSesEmail(args: SendEmailArgs): Promise<void> {
  const region = required("S3_REGION");
  const fromAddress = required("SES_FROM_ADDRESS");

  const sesClient = new SESv2Client({ region });

  // ✅ RAW so we can include custom headers like List-Unsubscribe
  const raw = buildRawMimeEmail({
    from: fromAddress,
    to: args.to,
    subject: args.subject,
    htmlBody: args.htmlBody,
    textBody: args.textBody,
    replyTo: args.replyTo,
    headers: args.headers,
  });

  const input: SendEmailCommandInput = {
    FromEmailAddress: fromAddress,
    Destination: { ToAddresses: [args.to] },
    Content: {
      Raw: {
        Data: Buffer.from(raw, "utf8"),
      },
    },
    ReplyToAddresses: args.replyTo ? [args.replyTo] : undefined,
  };

  await sesClient.send(new SendEmailCommand(input));
}
