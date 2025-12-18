"use server";

import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function sendNow(campaignId: string) {
  await db
    .update(emailCampaigns)
    .set({ status: "sending", updatedAt: new Date() })
    .where(eq(emailCampaigns.id, campaignId));

  revalidatePath(`/admin/email/campaigns/${campaignId}`);
}
