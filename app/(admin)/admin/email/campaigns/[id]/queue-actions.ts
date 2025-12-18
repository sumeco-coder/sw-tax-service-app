"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients, emailUnsubscribes, waitlist } from "@/drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function autoAddBySegment(campaignId: string) {
  const [campaign] = await db
    .select({ segment: emailCampaigns.segment })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) throw new Error("Campaign not found");

  // pull waitlist emails based on segment
  const statuses =
    campaign.segment === "waitlist_pending"
      ? ["pending"]
      : campaign.segment === "waitlist_approved"
      ? ["approved"]
      : ["pending", "approved", "rejected"]; // waitlist_all

  const rows = await db
    .select({ email: waitlist.email })
    .from(waitlist)
    .where(inArray(waitlist.status, statuses as any));

  const emails = [...new Set(rows.map((r) => r.email.toLowerCase().trim()))].filter(Boolean);

  if (!emails.length) return;

  // skip known unsubscribes
  const unsub = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, emails));

  const unsubSet = new Set(unsub.map((u) => u.email.toLowerCase()));

  const toInsert = emails.map((email) => ({
    campaignId,
    email,
    unsubToken: makeToken(),
    status: unsubSet.has(email) ? ("unsubscribed" as const) : ("queued" as const),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // if you added (campaignId,email) unique index, this prevents duplicates
  await db
    .insert(emailRecipients)
    .values(toInsert)
    .onConflictDoNothing();

  revalidatePath(`/admin/email/campaigns/${campaignId}`);
}
