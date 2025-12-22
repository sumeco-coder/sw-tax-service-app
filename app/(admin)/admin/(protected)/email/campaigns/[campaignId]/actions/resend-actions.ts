// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/actions/resend-actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients, emailUnsubscribes } from "@/drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function normalizeEmail(e: unknown) {
  return String(e ?? "").toLowerCase().trim();
}

export async function resendWholeCampaignAsCopy(campaignId: string) {
  const srcId = String(campaignId ?? "").trim();
  if (!srcId) throw new Error("Missing campaignId");

  // 1) Load original campaign
  const [src] = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      subject: emailCampaigns.subject,
      htmlBody: emailCampaigns.htmlBody,
      textBody: emailCampaigns.textBody,
      segment: emailCampaigns.segment,
    })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, srcId))
    .limit(1);

  if (!src) throw new Error("Campaign not found");

  // 2) Duplicate campaign
  const now = new Date();
  const [created] = await db
    .insert(emailCampaigns)
    .values({
      name: `${String(src.name ?? "Campaign")} (Resend)`,
      subject: src.subject,
      htmlBody: src.htmlBody,
      textBody: src.textBody ?? null,
      segment: src.segment as any,

      // cheapest plan: runner reads scheduledAt
      status: "scheduled" as any,
      scheduledAt: now,
      sentAt: null,
      schedulerName: null,

      createdAt: now,
      updatedAt: now,
    } as any)
    .returning({ id: emailCampaigns.id });

  const newId = String(created.id);

  // 3) Copy recipient emails from old campaign (don’t care about previous statuses)
  const oldRecipients = await db
    .select({ email: emailRecipients.email })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, srcId));

  const emails = Array.from(
    new Set(oldRecipients.map((r) => normalizeEmail(r.email)).filter(Boolean))
  );

  if (!emails.length) {
    // no recipients to resend to -> leave as draft
    await db
      .update(emailCampaigns)
      .set({ status: "draft" as any, scheduledAt: null, updatedAt: new Date() } as any)
      .where(eq(emailCampaigns.id, newId));

    revalidatePath("/admin/email/campaigns");
    redirect(`/admin/email/campaigns/${newId}`);
  }

  // 4) Global unsub blocklist
  const unsub = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, emails));

  const unsubSet = new Set(unsub.map((u) => normalizeEmail(u.email)).filter(Boolean));

  // 5) Insert recipients for the new campaign
  const toInsert = emails.map((email) => ({
    campaignId: newId,
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

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${srcId}`);
  redirect(`/admin/email/campaigns/${newId}`);
}
