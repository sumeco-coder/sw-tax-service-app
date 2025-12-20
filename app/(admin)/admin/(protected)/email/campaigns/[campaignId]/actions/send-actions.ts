// app/(admin)/admin/(protected)/email/campaigns/[Id]/actions/send-actions.ts
"use server";

import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients } from "@/drizzle/schema";
import { sendResendEmail } from "@/lib/email/resend";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BATCH_SIZE = 200; // keep small to avoid timeouts

export async function sendNow(campaignId: string) {
  // 1) Load campaign
  const [campaign] = await db
    .select({
      id: emailCampaigns.id,
      subject: emailCampaigns.subject,
      htmlBody: emailCampaigns.htmlBody,
      textBody: emailCampaigns.textBody,
      status: emailCampaigns.status,
    })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) throw new Error("Campaign not found");

  // 2) Mark campaign as sending (visible change)
  await db
    .update(emailCampaigns)
    .set({ status: "sending", updatedAt: new Date(), sentAt: null })
    .where(eq(emailCampaigns.id, campaignId));

  // 3) Get queued recipients (batch)
  const recipients = await db
    .select({
      id: emailRecipients.id,
      email: emailRecipients.email,
      status: emailRecipients.status,
      unsubToken: emailRecipients.unsubToken,
    })
    .from(emailRecipients)
    .where(
      and(
        eq(emailRecipients.campaignId, campaignId),
        eq(emailRecipients.status, "queued")
      )
    )
    .orderBy(sql`${emailRecipients.createdAt} asc`)
    .limit(BATCH_SIZE);

  if (!recipients.length) {
    // No one to send to — set back to draft or sent depending on your preference
    await db
      .update(emailCampaigns)
      .set({ status: "sent", updatedAt: new Date(), sentAt: new Date() })
      .where(eq(emailCampaigns.id, campaignId));

    revalidatePath(`/admin/email/campaigns/${campaignId}`);
    redirect(`/admin/email/campaigns/${campaignId}`);
  }

  // 4) Send emails one-by-one (simple + reliable)
  // You can optimize later (concurrency), but start stable.
  for (const r of recipients) {
    try {
      await sendResendEmail({
        to: r.email,
        subject: campaign.subject,
        htmlBody: campaign.htmlBody,
        textBody: campaign.textBody ?? undefined,
        // Optional: reply-to
        replyTo: "support@swtaxservice.com",
        // Optional: add tracking headers
        headers: {
          "X-SWTS-Campaign-Id": campaignId,
          "X-SWTS-Recipient-Id": r.id,
        },
      });

      await db
        .update(emailRecipients)
        .set({
          status: "sent",
          sentAt: new Date(),
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(emailRecipients.id, r.id));
    } catch (err: any) {
      await db
        .update(emailRecipients)
        .set({
          status: "failed",
          error: String(err?.message ?? err ?? "Send failed"),
          updatedAt: new Date(),
        })
        .where(eq(emailRecipients.id, r.id));
    }
  }

  // 5) If there are still queued recipients, keep status "sending"
  // If none queued, mark "sent"
  const [left] = await db
    .select({
      queued: sql<number>`count(*)::int`,
    })
    .from(emailRecipients)
    .where(
      and(
        eq(emailRecipients.campaignId, campaignId),
        eq(emailRecipients.status, "queued")
      )
    );

  const hasMoreQueued = (left?.queued ?? 0) > 0;

  await db
    .update(emailCampaigns)
    .set({
      status: hasMoreQueued ? "sending" : "sent",
      sentAt: hasMoreQueued ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/logs");
  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${campaignId}`);

  redirect(`/admin/email/campaigns/${campaignId}`);
}
