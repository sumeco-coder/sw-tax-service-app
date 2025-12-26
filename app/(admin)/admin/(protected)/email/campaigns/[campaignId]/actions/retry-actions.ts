// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/actions/retry-actions.ts
"use server";

import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Retry ONLY failed recipients:
 * - failed -> queued
 * - if anything queued, mark campaign scheduled to run ASAP (DB-runner friendly)
 */
export async function retryFailed(campaignId: string) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("Missing campaignId");

  const now = new Date();

  // 1) Reset failed -> queued
  await db
    .update(emailRecipients)
    .set({
      status: "queued" as any,
      error: null,
      updatedAt: now,
    } as any)
    .where(
      and(
        eq(emailRecipients.campaignId, id),
        eq(emailRecipients.status as any, "failed" as any)
      )
    );

  // 2) Count queued
  const [row] = await db
    .select({
      queued: sql<number>`count(*)::int`,
    })
    .from(emailRecipients)
    .where(
      and(
        eq(emailRecipients.campaignId, id),
        eq(emailRecipients.status as any, "queued" as any)
      )
    );

  const queued = row?.queued ?? 0;

  // 3) If anything queued, schedule campaign to run ASAP (DB scheduling)
  if (queued > 0) {
    await db
      .update(emailCampaigns)
      .set({
        status: "scheduled" as any,
        scheduledAt: now,        // "now" (runner will pick up on next tick)
        schedulerName: null,     // ✅ important: keep DB-runner ownership
        sentAt: null,
        updatedAt: now,
      } as any)
      .where(eq(emailCampaigns.id, id));
  }

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}
