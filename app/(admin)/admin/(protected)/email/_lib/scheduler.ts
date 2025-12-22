"use server";

import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";

export async function assertQueuedRecipients(campaignId: string) {
  const [q] = await db
    .select({
      queued: sql<number>`sum(case when ${emailRecipients.status} = 'queued' then 1 else 0 end)::int`,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, campaignId));

  const queued = q?.queued ?? 0;
  if (queued <= 0) {
    throw new Error(
      "No queued recipients for this campaign. Open the campaign and add/build recipients first."
    );
  }
}

export async function scheduleCampaignInDb(opts: {
  campaignId: string;
  sendAt: Date;
}) {
  await assertQueuedRecipients(opts.campaignId);

  await db
    .update(emailCampaigns)
    .set({
      status: "scheduled" as any,
      scheduledAt: opts.sendAt,
      schedulerName: null, // ✅ not using AWS Scheduler
      updatedAt: new Date(),
    } as any)
    .where(eq(emailCampaigns.id, opts.campaignId));
}

export async function cancelCampaignScheduleInDb(campaignId: string) {
  await db
    .update(emailCampaigns)
    .set({
      status: "draft" as any,
      scheduledAt: null,
      schedulerName: null,
      updatedAt: new Date(),
    } as any)
    .where(eq(emailCampaigns.id, campaignId));
}
