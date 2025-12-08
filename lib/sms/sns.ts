// lib/sms/sns.ts
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const region = process.env.S3_REGION || "us-west-1";
const smsEnabled = process.env.SNS_SMS_ENABLED === "true";

const snsClient = new SNSClient({ region });

export async function sendSms(to: string, message: string) {
  if (!smsEnabled) return; // quietly skip if not enabled

  if (!to) return;

  await snsClient.send(
    new PublishCommand({
      PhoneNumber: to,
      Message: message,
    })
  );
}
