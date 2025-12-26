// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/actions/queue-actions.ts
"use server";

import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildRecipientsFromAudience } from "@/lib/helpers/build-recipients-from-audience.server";

export async function queueRecipientsFromSavedAudience(
  campaignId: string,
  limit = 5000
) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId missing");

  const [c] = await db
    .select({
      segment: emailCampaigns.segment,
      listId: (emailCampaigns as any).listId,
      apptSegment: (emailCampaigns as any).apptSegment,
      manualRecipientsRaw: (emailCampaigns as any).manualRecipientsRaw,
    })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);

  if (!c) throw new Error("Campaign not found");

  await buildRecipientsFromAudience({
    campaignId: id,
    segment: String(c.segment ?? "waitlist_pending"),
    listId: c.listId ? String(c.listId) : null,
    apptSegment: c.apptSegment ? String(c.apptSegment) : null,
    manualRecipientsRaw: c.manualRecipientsRaw ? String(c.manualRecipientsRaw) : null,

    // one knob for all sources
    waitlistLimit: limit,
    listLimit: limit,
    apptLimit: limit,
    manualLimit: limit,
  });

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}
