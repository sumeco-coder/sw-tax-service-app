// lib/email/ses.ts
"use server";

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";

const region = process.env.S3_REGION;
const fromAddress = process.env.SES_FROM_ADDRESS;

if (!region) {
  throw new Error("S3_REGION is not set");
}

if (!fromAddress) {
  throw new Error("SES_FROM_ADDRESS is not set");
}

// Reuse one client for the whole app
const sesClient = new SESv2Client({
  region,
  // Credentials will come from env (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
  // or from an IAM role in production. You normally don't need to pass them here
});

/**
 * Basic SES sendEmail helper.
 * You can reuse this for invites, notifications, etc.
 */
export async function sendSesEmail(args: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}): Promise<void> {
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

  const cmd = new SendEmailCommand(input);
  await sesClient.send(cmd);
}
