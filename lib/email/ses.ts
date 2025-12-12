// lib/email/ses.ts
"use server";

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function sendSesEmail(args: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}): Promise<void> {
  // Read env ONLY when the function is called
  const region = required("S3_REGION");
  const fromAddress = required("SES_FROM_ADDRESS");

  const sesClient = new SESv2Client({
    region,
    // credentials auto-loaded from env or IAM
  });

  const { to, subject, htmlBody, textBody } = args;

  const input: SendEmailCommandInput = {
    FromEmailAddress: fromAddress,
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
          ...(textBody
            ? {
                Text: {
                  Data: textBody,
                  Charset: "UTF-8",
                },
              }
            : {}),
        },
      },
    },
  };

  await sesClient.send(new SendEmailCommand(input));
}
