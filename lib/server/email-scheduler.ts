// lib/server/email-scheduler.ts
import {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  DeleteScheduleCommand,
} from "@aws-sdk/client-scheduler";

function toAtExpressionUtc(d: Date) {
  // at(YYYY-MM-DDTHH:MM:SS) (no ms, no Z)
  const isoNoMsNoZ = d.toISOString().slice(0, 19);
  return `at(${isoNoMsNoZ})`;
}

function getSchedulerClient() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) throw new Error("AWS_REGION is not set");
  return new SchedulerClient({ region });
}

function isConflict(err: any) {
  // AWS SDK v3 commonly uses name/code = "ConflictException"
  return err?.name === "ConflictException" || err?.code === "ConflictException";
}

export async function scheduleCampaignExact(opts: {
  campaignId: string;
  sendAt: Date;
  timezone?: string; // optional, default UTC
  provider?: "resend" | "ses";
}) {
  const { campaignId, sendAt, timezone = "UTC", provider = "resend" } = opts;

  const targetArn =
    process.env.EMAIL_CAMPAIGN_RUNNER_ARN ??
    process.env.EMAIL_CAMPAIGN_RUNNER_LAMBDA_ARN;

  const roleArn = process.env.SCHEDULER_INVOKE_ROLE_ARN;

  if (!targetArn) throw new Error("EMAIL_CAMPAIGN_RUNNER_ARN missing");
  if (!roleArn) throw new Error("SCHEDULER_INVOKE_ROLE_ARN missing");

  // Optional: don’t allow scheduling in the past
  if (sendAt.getTime() <= Date.now() + 10_000) {
    throw new Error("sendAt must be at least ~10 seconds in the future");
  }

  const scheduleName = `email-campaign-${campaignId}`;
  const client = getSchedulerClient();

  const base = {
    Name: scheduleName,
    GroupName: "default",
    FlexibleTimeWindow: { Mode: "OFF" as const },
    ScheduleExpression: toAtExpressionUtc(sendAt),
    ScheduleExpressionTimezone: timezone, // keep UTC unless you intentionally change it
    ActionAfterCompletion: "DELETE" as const,
    Description: `Send email campaign ${campaignId}`,
    Target: {
      Arn: targetArn,
      RoleArn: roleArn,
      Input: JSON.stringify({ campaignId, provider }),
    },
  };

  try {
    await client.send(new CreateScheduleCommand(base));
  } catch (err) {
    if (!isConflict(err)) {
      // real error -> surface it
      throw err;
    }
    // schedule already exists -> update it
    await client.send(new UpdateScheduleCommand(base));
  }

  return scheduleName;
}

export async function cancelScheduledCampaign(campaignId: string) {
  const scheduleName = `email-campaign-${campaignId}`;
  const client = getSchedulerClient();

  try {
    await client.send(
      new DeleteScheduleCommand({ Name: scheduleName, GroupName: "default" })
    );
  } catch {
    // ignore if it doesn't exist
  }

  return scheduleName;
}
