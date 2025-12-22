// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/actions/retry-actions.ts
"use server";

import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function retryFailed(campaignId: string) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("Missing campaignId");

  // ✅ reset failed -> queued
  await db
    .update(emailRecipients)
    .set({ status: "queued", error: null, updatedAt: new Date() })
    .where(and(eq(emailRecipients.campaignId, id), eq(emailRecipients.status, "failed")));

  // ✅ If there is anything queued now, schedule campaign to run ASAP (cheapest plan)
  const [row] = await db
    .select({ queued: sql<number>`count(*)::int` })
    .from(emailRecipients)
    .where(and(eq(emailRecipients.campaignId, id), eq(emailRecipients.status, "queued")));

  const queued = row?.queued ?? 0;

  if (queued > 0) {
    await db
      .update(emailCampaigns)
      .set({
        status: "scheduled" as any,
        scheduledAt: new Date(), // now
        sentAt: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(emailCampaigns.id, id));
  }

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}
