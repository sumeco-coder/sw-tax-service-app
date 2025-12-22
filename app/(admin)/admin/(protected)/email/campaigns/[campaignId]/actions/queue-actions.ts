// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/actions/queue-actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import {
  emailCampaigns,
  emailRecipients,
  emailUnsubscribes,
  waitlist,
} from "@/drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function autoAddBySegment(campaignId: string) {
  if (!campaignId) throw new Error("campaignId missing");

  const [campaign] = await db
    .select({ segment: emailCampaigns.segment })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) throw new Error("Campaign not found");

  // ✅ safety: only supports waitlist segments
  const seg = String(campaign.segment);
  if (!["waitlist_pending", "waitlist_approved", "waitlist_all"].includes(seg)) {
    throw new Error("autoAddBySegment only supports waitlist segments.");
  }

  // pull waitlist emails based on segment
  const statuses =
    seg === "waitlist_pending"
      ? ["pending"]
      : seg === "waitlist_approved"
      ? ["approved"]
      : ["pending", "approved"]; // ✅ waitlist_all (don’t email rejected)

  const rows = await db
    .select({ email: waitlist.email })
    .from(waitlist)
    .where(inArray(waitlist.status, statuses as any));

  // normalize + dedupe
  const emails = Array.from(
    new Set(
      rows
        .map((r) => String(r.email ?? "").toLowerCase().trim())
        .filter(Boolean)
    )
  );

  if (!emails.length) return;

  // skip known unsubscribes
  const unsub = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, emails));

  const unsubSet = new Set(
    unsub.map((u) => String(u.email ?? "").toLowerCase().trim()).filter(Boolean)
  );

  const now = new Date();
  const toInsert = emails.map((email) => ({
    campaignId,
    email,
    unsubToken: makeToken(),
    status: unsubSet.has(email) ? ("unsubscribed" as const) : ("queued" as const),
    createdAt: now,
    updatedAt: now,
  }));

  await db
    .insert(emailRecipients)
    .values(toInsert)
    .onConflictDoNothing({
      target: [emailRecipients.campaignId, emailRecipients.email],
    });

  revalidatePath(`/admin/email/campaigns/${campaignId}`);
}
