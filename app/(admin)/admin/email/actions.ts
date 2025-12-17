"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import {
  emailCampaigns,
  emailRecipients,
  emailUnsubscribes,
  waitlist,
} from "@/drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/email/sendEmail";

type Segment = "waitlist_pending" | "waitlist_approved" | "waitlist_all";

function getAppUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function buildUnsubUrls(token: string) {
  const base = getAppUrl();
  return {
    pageUrl: `${base}/unsubscribe?token=${token}`,
    oneClickUrl: `${base}/api/unsubscribe?token=${token}`,
  };
}

async function loadSegmentEmails(segment: Segment, limit: number) {
  if (segment === "waitlist_all") {
    const rows = await db.select({ email: waitlist.email }).from(waitlist).limit(limit);
    return rows.map((r) => r.email.toLowerCase().trim());
  }

  if (segment === "waitlist_pending") {
    const rows = await db
      .select({ email: waitlist.email })
      .from(waitlist)
      .where(eq(waitlist.status, "pending"))
      .limit(limit);

    return rows.map((r) => r.email.toLowerCase().trim());
  }

  const rows = await db
    .select({ email: waitlist.email })
    .from(waitlist)
    .where(eq(waitlist.status, "approved"))
    .limit(limit);

  return rows.map((r) => r.email.toLowerCase().trim());
}

export async function createAndSendCampaignAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim() || "Campaign";
  const segment = (String(formData.get("segment") ?? "waitlist_pending") as Segment) || "waitlist_pending";
  const limit = Number(formData.get("limit") ?? 200) || 200;

  const subject = String(formData.get("subject") ?? "").trim();
  const htmlBodyRaw = String(formData.get("htmlBody") ?? "");
  const textBodyRaw = String(formData.get("textBody") ?? "");

  if (!subject || !htmlBodyRaw || !textBodyRaw) return;

  // 1) Create campaign
  const [campaign] = await db
    .insert(emailCampaigns)
    .values({
      name,
      segment,
      status: "sending",
      subject,
      htmlBody: htmlBodyRaw,
      textBody: textBodyRaw,
      updatedAt: new Date(),
    })
    .returning();

  // 2) Load recipients (from waitlist segment)
  const emails = await loadSegmentEmails(segment, limit);

  if (emails.length === 0) {
    await db
      .update(emailCampaigns)
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(emailCampaigns.id, campaign.id));

    revalidatePath("/admin/email");
    return;
  }

  // 3) Prefetch unsubscribed emails (global blocklist)
  const unsubRows = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, emails));

  const unsubSet = new Set(unsubRows.map((r) => r.email.toLowerCase().trim()));

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  // 4) Send per recipient
  for (const email of emails) {
    const normalized = email.toLowerCase().trim();

    // Skip global unsubscribes
    if (unsubSet.has(normalized)) {
      skippedCount++;

      await db.insert(emailRecipients).values({
        campaignId: campaign.id,
        email: normalized,
        unsubToken: crypto.randomBytes(32).toString("hex"),
        status: "unsubscribed",
        error: "Skipped (unsubscribed)",
        updatedAt: new Date(),
      });

      continue;
    }

    // create per-recipient unsubscribe token
    const token = crypto.randomBytes(32).toString("hex");
    const { pageUrl, oneClickUrl } = buildUnsubUrls(token);

    const [rec] = await db
      .insert(emailRecipients)
      .values({
        campaignId: campaign.id,
        email: normalized,
        unsubToken: token,
        status: "queued",
        updatedAt: new Date(),
      })
      .returning();

    const htmlBody = `${htmlBodyRaw}
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
      <p style="font-size:12px;color:#6b7280">
        Don’t want these emails? <a href="${pageUrl}">Unsubscribe</a>.
      </p>
    `;

    const textBody = `${textBodyRaw}\n\n---\nUnsubscribe: ${pageUrl}\n`;

    try {
      await sendEmail({
        to: normalized,
        subject,
        htmlBody,
        textBody,
        replyTo: "support@swtaxservice.com",
        headers: {
          "List-Unsubscribe": `<${oneClickUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      sentCount++;

      await db
        .update(emailRecipients)
        .set({
          status: "sent",
          sentAt: new Date(),
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(emailRecipients.id, rec.id));
    } catch (err: any) {
      failedCount++;

      await db
        .update(emailRecipients)
        .set({
          status: "failed",
          error: String(err?.message ?? err),
          updatedAt: new Date(),
        })
        .where(eq(emailRecipients.id, rec.id));
    }
  }

  // 5) Finalize campaign status
  const finalStatus =
    sentCount === 0 && failedCount > 0 ? "failed" : "sent";

  await db
    .update(emailCampaigns)
    .set({
      status: finalStatus,
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaign.id));

  revalidatePath("/admin/email");
}
