// app/api/admin/email/schedule/route.ts
import { NextResponse } from "next/server";
import {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  DeleteScheduleCommand,
} from "@aws-sdk/client-scheduler";
import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

function assertAdminAuth(req: Request) {
  const secret = process.env.EMAIL_SCHEDULER_SECRET;
  if (!secret) throw new Error("EMAIL_SCHEDULER_SECRET is not set");

  const header = req.headers.get("x-scheduler-secret") ?? "";
  if (header !== secret) throw new Error("Unauthorized");
}

function toAtExpression(d: Date) {
  // EventBridge Scheduler wants: at(2025-12-21T20:00:00Z)
  return `at(${d.toISOString().replace(/\.\d{3}Z$/, "Z")})`;
}

export async function POST(req: Request) {
  try {
    assertAdminAuth(req);

    const body = await req.json();

    const campaignId =
      typeof body?.campaignId === "string" ? body.campaignId : "";
    const sendAtIso = typeof body?.sendAt === "string" ? body.sendAt : "";
    const mode = typeof body?.mode === "string" ? body.mode : "schedule"; // "schedule" | "cancel"

    if (!campaignId) {
      return NextResponse.json(
        { ok: false, error: "campaignId is required" },
        { status: 400 }
      );
    }

    const scheduleName = `email-campaign-${campaignId}`;

    // ✅ Cancel mode (delete schedule + clear DB)
    if (mode === "cancel") {
      const client = new SchedulerClient({});

      try {
        await client.send(
          new DeleteScheduleCommand({
            Name: scheduleName,
            GroupName: "default",
          })
        );
      } catch {
        // ignore if it doesn't exist
      }

      await db
        .update(emailCampaigns)
        .set({
          status: "draft" as any,
          scheduledAt: null,
          schedulerName: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(emailCampaigns.id, campaignId));

      return NextResponse.json({ ok: true, cancelled: true, scheduleName });
    }

    // ✅ Schedule mode (default)
    if (!sendAtIso) {
      return NextResponse.json(
        { ok: false, error: "sendAt is required" },
        { status: 400 }
      );
    }

    const sendAt = new Date(sendAtIso);
    if (Number.isNaN(sendAt.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid sendAt datetime" },
        { status: 400 }
      );
    }

    // safety buffer: must be in the future
    if (sendAt.getTime() < Date.now() + 60_000) {
      return NextResponse.json(
        { ok: false, error: "sendAt must be at least 1 minute in the future" },
        { status: 400 }
      );
    }

    const targetArn = process.env.EMAIL_CAMPAIGN_RUNNER_ARN;
    const roleArn = process.env.SCHEDULER_INVOKE_ROLE_ARN;

    if (!targetArn) throw new Error("EMAIL_CAMPAIGN_RUNNER_ARN missing");
    if (!roleArn) throw new Error("SCHEDULER_INVOKE_ROLE_ARN missing");

    // ✅ update DB (scheduled)
    await db
      .update(emailCampaigns)
      .set({
        status: "scheduled" as any, // ensure enum includes "scheduled"
        scheduledAt: sendAt,
        schedulerName: scheduleName,
        updatedAt: new Date(),
      } as any)
      .where(eq(emailCampaigns.id, campaignId));

    const client = new SchedulerClient({});

    const payload = {
      campaignId,
      provider: "resend",
    };

    const base = {
      Name: scheduleName,
      GroupName: "default",
      ScheduleExpression: toAtExpression(sendAt),
      FlexibleTimeWindow: { Mode: "OFF" as const },
      Target: {
        Arn: targetArn,
        RoleArn: roleArn,
        Input: JSON.stringify(payload),
      },
      ActionAfterCompletion: "DELETE" as const,
      Description: `Send email campaign ${campaignId}`,
    };

    // ✅ create or update
    try {
      await client.send(new CreateScheduleCommand(base));
    } catch (e: any) {
      await client.send(new UpdateScheduleCommand(base));
    }

    return NextResponse.json({
      ok: true,
      scheduleName,
      scheduledAt: sendAt.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 401 }
    );
  }
}
