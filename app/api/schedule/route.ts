import { NextResponse } from "next/server";
import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

function assertAdminAuth(req: Request) {
  // simplest protection: secret header
  const secret = process.env.EMAIL_SCHEDULER_SECRET;
  if (!secret) throw new Error("EMAIL_SCHEDULER_SECRET is not set");

  const header = req.headers.get("x-scheduler-secret") ?? "";
  if (header !== secret) throw new Error("Unauthorized");
}

export async function POST(req: Request) {
  try {
    assertAdminAuth(req);

    const body = await req.json();

    const campaignId =
      typeof body?.campaignId === "string" ? body.campaignId : "";
    const sendAtIso =
      typeof body?.sendAt === "string" ? body.sendAt : "";

    if (!campaignId || !sendAtIso) {
      return NextResponse.json(
        { ok: false, error: "campaignId and sendAt are required" },
        { status: 400 }
      );
    }

    // validate date
    const sendAt = new Date(sendAtIso);
    if (Number.isNaN(sendAt.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid sendAt datetime" },
        { status: 400 }
      );
    }

    const targetArn = process.env.EMAIL_CAMPAIGN_RUNNER_ARN;
    const roleArn = process.env.SCHEDULER_INVOKE_ROLE_ARN;

    if (!targetArn) throw new Error("EMAIL_CAMPAIGN_RUNNER_ARN missing");
    if (!roleArn) throw new Error("SCHEDULER_INVOKE_ROLE_ARN missing");

    // make schedule name deterministic per campaign
    const scheduleName = `email-campaign-${campaignId}`;

    // mark campaign scheduled in DB (optional if you have enum "scheduled")
    await db
      .update(emailCampaigns)
      .set({ status: "sending", updatedAt: new Date() } as any) // adjust if you use "scheduled"
      .where(eq(emailCampaigns.id, campaignId));

    const client = new SchedulerClient({});

    const cmd = new CreateScheduleCommand({
      Name: scheduleName,
      GroupName: "default",
      ScheduleExpression: `at(${sendAt.toISOString().replace(/\.\d{3}Z$/, "Z")})`,
      FlexibleTimeWindow: { Mode: "OFF" },
      Target: {
        Arn: targetArn,
        RoleArn: roleArn,
        Input: JSON.stringify({ campaignId }),
      },
      ActionAfterCompletion: "DELETE", // auto cleanup
      Description: `Send email campaign ${campaignId}`,
    });

    await client.send(cmd);

    return NextResponse.json({ ok: true, scheduleName });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 401 }
    );
  }
}
