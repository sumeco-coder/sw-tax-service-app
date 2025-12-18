"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { emailRecipients, emailSubscribers } from "@/drizzle/schema";
import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function addSelectedToCampaign(opts: {
  campaignId: string;
  subscriberIds: string[];
}) {
  const { campaignId, subscriberIds } = opts;

  if (!subscriberIds?.length) return;

  const subs = await db
    .select({
      id: emailSubscribers.id,
      email: emailSubscribers.email,
      status: emailSubscribers.status,
    })
    .from(emailSubscribers)
    .where(inArray(emailSubscribers.id, subscriberIds));

  const toQueue = subs
    .filter((s) => s.status === "subscribed")
    .map((s) => ({
      campaignId,
      email: s.email.toLowerCase(),
      unsubToken: makeToken(),
      status: "queued" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  if (!toQueue.length) return;

  await db.insert(emailRecipients).values(toQueue);

  revalidatePath(`/admin/email/campaigns/${campaignId}`);
}
