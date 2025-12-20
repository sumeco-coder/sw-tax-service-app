// app/(admin)/admin/(protected)/email/capaigns/[campaignId]/actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { emailRecipients, emailSubscribers, emailUnsubscribes } from "@/drizzle/schema";
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

  const emails = subs
    .filter((s) => s.status === "subscribed")
    .map((s) => s.email.toLowerCase().trim())
    .filter(Boolean);

  if (!emails.length) return;

  // ✅ skip known unsubscribes
  const unsub = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, emails));

  const unsubSet = new Set(unsub.map((u) => u.email.toLowerCase()));

  const toQueue = emails.map((email) => ({
    campaignId,
    email,
    unsubToken: makeToken(),
    status: unsubSet.has(email) ? ("unsubscribed" as const) : ("queued" as const),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db
    .insert(emailRecipients)
    .values(toQueue)
    .onConflictDoNothing(); // ✅ respects your (campaignId,email) unique index

  revalidatePath(`/admin/email/campaigns/${campaignId}`);
}
