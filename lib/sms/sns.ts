// lib/sms/sns.ts
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

function getRegion() {
  return process.env.S3_REGION || "us-west-1";
}

function isSmsEnabled() {
  return process.env.SNS_SMS_ENABLED === "true";
}

let snsClient: SNSClient | null = null;
function getClient() {
  if (!snsClient) snsClient = new SNSClient({ region: getRegion() });
  return snsClient;
}

export async function sendSms(to: string, message: string) {
  if (!isSmsEnabled()) return;
  if (!to) return;

  await getClient().send(
    new PublishCommand({
      PhoneNumber: to,
      Message: message,
    })
  );
}
