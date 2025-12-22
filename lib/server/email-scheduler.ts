// lib/server/email-scheduler.ts
import {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  DeleteScheduleCommand,
} from "@aws-sdk/client-scheduler";

function toAtExpression(d: Date) {
  // at(YYYY-MM-DDTHH:MM:SS) (no ms, no Z) + timezone set separately
  const isoNoMs = d.toISOString().slice(0, 19);
  return `at(${isoNoMs})`;
}

function getSchedulerClient() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) throw new Error("AWS_REGION is not set");
  return new SchedulerClient({ region });
}

export async function scheduleCampaignExact(opts: {
  campaignId: string;
  sendAt: Date;
}) {
  const { campaignId, sendAt } = opts;

  // ✅ support either env name (you had both patterns in your project)
  const targetArn =
    process.env.EMAIL_CAMPAIGN_RUNNER_ARN ??
    process.env.EMAIL_CAMPAIGN_RUNNER_LAMBDA_ARN;

  const roleArn = process.env.SCHEDULER_INVOKE_ROLE_ARN;

  if (!targetArn) throw new Error("EMAIL_CAMPAIGN_RUNNER_ARN missing");
  if (!roleArn) throw new Error("SCHEDULER_INVOKE_ROLE_ARN missing");

  const scheduleName = `email-campaign-${campaignId}`;

  const client = getSchedulerClient();

  const base = {
    Name: scheduleName,
    GroupName: "default",
    FlexibleTimeWindow: { Mode: "OFF" as const },
    ScheduleExpression: toAtExpression(sendAt),
    ScheduleExpressionTimezone: "UTC",
    ActionAfterCompletion: "DELETE" as const,
    Description: `Send email campaign ${campaignId}`,
    Target: {
      Arn: targetArn,
      RoleArn: roleArn,
      Input: JSON.stringify({ campaignId, provider: "resend" }),
    },
  };

  try {
    await client.send(new CreateScheduleCommand(base));
  } catch {
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
