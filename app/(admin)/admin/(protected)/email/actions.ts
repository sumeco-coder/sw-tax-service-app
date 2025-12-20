// app/(admin)/admin/(protected)/email/actions.ts
// app/(admin)/admin/(protected)/email/actions.ts
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
import { and, eq, inArray } from "drizzle-orm";

import { sendEmail } from "@/lib/email/sendEmail"; // ✅ keep your wrapper
import { renderTemplate, hasUnrenderedTokens } from "@/lib/email/renderTemplate";
import { buildEmailFooterHTML, buildEmailFooterText } from "@/lib/email/footer";
import { z } from "zod";

type Segment = "waitlist_pending" | "waitlist_approved" | "waitlist_all";

const SendCampaignSchema = z.object({
  name: z.string().trim().min(1).optional(),
  segment: z
    .enum(["waitlist_pending", "waitlist_approved", "waitlist_all"])
    .default("waitlist_pending"),
  limit: z.coerce.number().int().min(1).max(5000).default(200),
  subject: z.string().trim().min(2, "Subject is required."),
  htmlBody: z.string().trim().min(5, "HTML body is required."),
  textBody: z.string().trim().min(5, "Text body is required."),
});

function getAppUrl() {
  // ✅ set APP_URL=https://www.swtaxservice.com in prod
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function buildUnsubUrls(token: string) {
  const base = getAppUrl();
  return {
    pageUrl: `${base}/unsubscribe?token=${encodeURIComponent(token)}`,
    oneClickUrl: `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`,
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

  // approved
  const rows = await db
    .select({ email: waitlist.email })
    .from(waitlist)
    .where(eq(waitlist.status, "approved"))
    .limit(limit);

  return rows.map((r) => r.email.toLowerCase().trim());
}

/**
 * Quick send: creates + sends a campaign immediately to a WAITLIST segment
 * (used by /admin/email “Send campaign” form)
 */
export async function createAndSendCampaignAction(formData: FormData): Promise<void> {
  const parsed = SendCampaignSchema.safeParse({
    name: formData.get("name"),
    segment: formData.get("segment"),
    limit: formData.get("limit"),
    subject: formData.get("subject"),
    htmlBody: formData.get("htmlBody"),
    textBody: formData.get("textBody"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { name, segment, limit, subject: subjectRaw, htmlBody: htmlBodyRaw, textBody: textBodyRaw } =
    parsed.data;

  // 1) Create campaign
  const [campaign] = await db
    .insert(emailCampaigns)
    .values({
      name: name?.trim() || "Campaign",
      segment,
      status: "sending",
      subject: subjectRaw,
      htmlBody: htmlBodyRaw,
      textBody: textBodyRaw,
      updatedAt: new Date(),
    })
    .returning({ id: emailCampaigns.id });

  // 2) Load emails
  const emailsRaw = await loadSegmentEmails(segment, limit);
  const emails = [...new Set(emailsRaw)].filter(Boolean);

  if (!emails.length) {
    await db
      .update(emailCampaigns)
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(emailCampaigns.id, campaign.id));

    revalidatePath("/admin/email");
    return;
  }

  // 3) Global unsubscribes
  const unsubRows = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, emails));

  const unsubSet = new Set(unsubRows.map((r) => r.email.toLowerCase().trim()));

  // 4) Template footer behavior (check RAW template)
  const templateHasFooterHtml = htmlBodyRaw.includes("{{footer_html}}");
  const templateHasFooterText = textBodyRaw.includes("{{footer_text}}");

  let sentCount = 0;
  let failedCount = 0;

  for (const email of emails) {
    const normalized = email.toLowerCase().trim();
    if (!normalized) continue;

    // If globally unsubscribed, log and skip
    if (unsubSet.has(normalized)) {
      await db
        .insert(emailRecipients)
        .values({
          campaignId: campaign.id,
          email: normalized,
          unsubToken: makeToken(),
          status: "unsubscribed",
          error: "Skipped (unsubscribed)",
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      continue;
    }

    // ✅ insert recipient row if missing
    const insertedToken = makeToken();

    await db
      .insert(emailRecipients)
      .values({
        campaignId: campaign.id,
        email: normalized,
        unsubToken: insertedToken,
        status: "queued",
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    // ✅ always load the row that exists (new or previous)
    const [rec] = await db
      .select({
        id: emailRecipients.id,
        status: emailRecipients.status,
        unsubToken: emailRecipients.unsubToken,
      })
      .from(emailRecipients)
      .where(and(eq(emailRecipients.campaignId, campaign.id), eq(emailRecipients.email, normalized)))
      .limit(1);

    // If it already exists and isn't queued, don't re-send
    if (!rec?.id || rec.status !== "queued") continue;

    const { pageUrl, oneClickUrl } = buildUnsubUrls(rec.unsubToken);

    const footerHtml = buildEmailFooterHTML("marketing", {
      companyName: "SW Tax Service",
      addressLine: "Las Vegas, NV",
      supportEmail: "support@swtaxservice.com",
      website: "https://www.swtaxservice.com",
      unsubUrl: pageUrl,
    });

    const footerText = buildEmailFooterText("marketing", {
      companyName: "SW Tax Service",
      addressLine: "Las Vegas, NV",
      supportEmail: "support@swtaxservice.com",
      website: "https://www.swtaxservice.com",
      unsubUrl: pageUrl,
    });

    const vars = {
      company_name: "SW Tax Service",
      waitlist_link: "https://www.swtaxservice.com/waitlist",
      support_email: "support@swtaxservice.com",
      website: "https://www.swtaxservice.com",
      first_name: "there",
      signature_name: "SW Tax Service Team",

      unsubscribe_link: pageUrl,
      one_click_unsub_url: oneClickUrl,

      footer_html: footerHtml,
      footer_text: footerText,
    };

    const subject = renderTemplate(subjectRaw, vars);

    let htmlBody = renderTemplate(htmlBodyRaw, vars);
    let textBody = renderTemplate(textBodyRaw, vars);

    // ✅ If template didn't include {{footer_*}}, append automatically
    if (!templateHasFooterHtml) htmlBody = `${htmlBody}\n\n${footerHtml}`;
    if (!templateHasFooterText) textBody = `${textBody}\n\n${footerText}`;

    // ✅ never send raw tokens
    if (hasUnrenderedTokens(htmlBody) || hasUnrenderedTokens(textBody) || hasUnrenderedTokens(subject)) {
      failedCount++;
      await db
        .update(emailRecipients)
        .set({
          status: "failed",
          error: "Template contains unknown {{tokens}}. Fix template variables.",
          updatedAt: new Date(),
        })
        .where(eq(emailRecipients.id, rec.id));
      continue;
    }

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

  // 5) finalize campaign status
  const finalStatus = sentCount === 0 && failedCount > 0 ? "failed" : "sent";

  await db
    .update(emailCampaigns)
    .set({
      status: finalStatus,
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaign.id));

  revalidatePath("/admin/email");
  revalidatePath("/admin/email/logs");
}
