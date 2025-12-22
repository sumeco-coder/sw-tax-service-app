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
  const b64 = Buffer.from(String(s ?? ""), "utf8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

function sanitizeFilename(name: string) {
  // Keep it simple and safe for headers
  const n = String(name ?? "attachment").replace(/[\r\n"]/g, "").trim();
  return n || "attachment";
}

function buildRawMimeEmail(args: {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: SendEmailArgs["attachments"];
}) {
  const crlf = "\r\n";

  const hasAttachments = (args.attachments?.length ?? 0) > 0;

  // Boundaries
  const mixedBoundary = `----=_Mixed_${Math.random().toString(16).slice(2)}`;
  const altBoundary = `----=_Alt_${Math.random().toString(16).slice(2)}`;

  const lines: string[] = [];

  // Standard headers
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

  // Content-Type header depends on attachments
  if (hasAttachments) {
    lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  } else {
    lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  }

  lines.push(""); // blank line between headers and body

  // Helper to write the alternative part
  const writeAlternativePart = () => {
    // text/plain
    const text = args.textBody ?? "";
    lines.push(`--${altBoundary}`);
    lines.push(`Content-Type: text/plain; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: 8bit`);
    lines.push("");
    lines.push(text);
    lines.push("");

    // text/html
    lines.push(`--${altBoundary}`);
    lines.push(`Content-Type: text/html; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: 8bit`);
    lines.push("");
    lines.push(args.htmlBody);
    lines.push("");

    // end alt
    lines.push(`--${altBoundary}--`);
    lines.push("");
  };

  if (!hasAttachments) {
    // Simple: multipart/alternative only
    writeAlternativePart();
    return lines.join(crlf);
  }

  // multipart/mixed:
  // 1) First part is multipart/alternative (text+html)
  lines.push(`--${mixedBoundary}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  lines.push("");
  writeAlternativePart();

  // 2) Attachments
  for (const att of args.attachments ?? []) {
    if (!att?.filename || att.content == null) continue;

    const filename = sanitizeFilename(att.filename);
    const contentType =
      att.contentType?.trim() || "application/octet-stream";

    // Base64 encode attachment content (your attachments.content is raw string)
    const base64 = Buffer.from(String(att.content), "utf8").toString("base64");

    lines.push(`--${mixedBoundary}`);
    lines.push(
      `Content-Type: ${contentType}; name="${encodeMimeWord(filename)}"`
    );
    lines.push(`Content-Disposition: attachment; filename="${encodeMimeWord(filename)}"`);
    lines.push(`Content-Transfer-Encoding: base64`);
    lines.push("");

    // Split base64 into 76-char lines (RFC-friendly)
    for (let i = 0; i < base64.length; i += 76) {
      lines.push(base64.slice(i, i + 76));
    }
    lines.push("");
  }

  // end mixed
  lines.push(`--${mixedBoundary}--`);
  lines.push("");

  return lines.join(crlf);
}

export async function sendSesEmail(args: SendEmailArgs): Promise<void> {
  const region = required("S3_REGION"); // (your env name)
  const fromAddress = required("SES_FROM_ADDRESS");

  const sesClient = new SESv2Client({ region });

  // ✅ RAW so we can include custom headers like List-Unsubscribe + attachments
  const raw = buildRawMimeEmail({
    from: fromAddress,
    to: args.to,
    subject: args.subject,
    htmlBody: args.htmlBody,
    textBody: args.textBody,
    replyTo: args.replyTo,
    headers: args.headers,
    attachments: args.attachments,
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
