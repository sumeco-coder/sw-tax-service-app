// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/actions/send-actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients } from "@/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sendResendEmail } from "@/lib/email/resend";
import { renderTemplate, hasUnrenderedTokens } from "@/lib/helpers/render-template";
import { htmlToText } from "html-to-text";
import { buildEmailFooterHTML, buildEmailFooterText } from "@/lib/email/footer";

const BATCH_SIZE = 200;

// Safety cap so a single click doesn’t try to send 30k in one server-action run
// (Click “Send Now” again to continue if you have more than this)
const MAX_PER_RUN = 2000;

const REPLY_TO = "support@swtaxservice.com";

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function getSiteUrl() {
  const base =
    process.env.APP_ORIGIN ??
    process.env.APP_URL ??
    "https://www.swtaxservice.com";

  return String(base).trim().replace(/\/$/, "");
}


function buildUnsubUrls(token: string) {
  const base = getSiteUrl();
  return {
    pageUrl: `${base}/unsubscribe?token=${encodeURIComponent(token)}`,
    oneClickUrl: `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`,
  };
}

function assertResendWindow(sendAt: Date) {
  const max = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  if (sendAt.getTime() < Date.now() + 60_000) {
    throw new Error("Send time must be at least 1 minute in the future.");
  }
  if (sendAt.getTime() > max) {
    throw new Error("Resend can only schedule up to 30 days in advance.");
  }
}

async function getCampaign(campaignId: string) {
  const [campaign] = await db
    .select({
      id: emailCampaigns.id,
      status: emailCampaigns.status,
      subject: emailCampaigns.subject,
      htmlBody: emailCampaigns.htmlBody,
      textBody: emailCampaigns.textBody,
    })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) throw new Error("Campaign not found");

  const htmlTpl = String(campaign.htmlBody ?? "").trim();
  const textTpl = String(campaign.textBody ?? "").trim();
  if (!htmlTpl) throw new Error("Campaign htmlBody is empty (HTML required).");

  const templateHasFooterHtml =
    htmlTpl.includes("{{footer_html}}") || htmlTpl.includes("{{{footer_html}}}");
  const templateHasFooterText =
    textTpl.includes("{{footer_text}}") || textTpl.includes("{{{footer_text}}}");

  return { campaign, htmlTpl, textTpl, templateHasFooterHtml, templateHasFooterText };
}

/**
 * Claim a batch of queued recipients by flipping them to "sending" first.
 * This prevents double-send / double-schedule.
 */
async function claimQueuedBatch(campaignId: string) {
  const queued = await db
    .select({
      id: emailRecipients.id,
      email: emailRecipients.email,
      unsubToken: (emailRecipients as any).unsubToken,
    })
    .from(emailRecipients)
    .where(
      and(
        eq(emailRecipients.campaignId, campaignId),
        eq(emailRecipients.status as any, "queued" as any)
      )
    )
    .orderBy(sql`${emailRecipients.createdAt} asc`)
    .limit(BATCH_SIZE);

  if (!queued.length) return [];

  const ids = queued.map((r) => r.id);

  // ✅ only claim ones still queued (if another process claimed first, it won’t return)
  const claimed = await db
    .update(emailRecipients)
    .set({ status: "sending" as any, updatedAt: new Date() } as any)
    .where(
      and(
        eq(emailRecipients.campaignId, campaignId),
        inArray(emailRecipients.id, ids),
        eq(emailRecipients.status as any, "queued" as any)
      )
    )
    .returning({
      id: emailRecipients.id,
      email: emailRecipients.email,
      unsubToken: (emailRecipients as any).unsubToken,
    });

  return claimed;
}

function buildVars(opts: { unsubPageUrl: string; oneClickUrl: string; footerHtml: string; footerText: string }) {
  const { unsubPageUrl, oneClickUrl, footerHtml, footerText } = opts;

  return {
    company_name: "SW Tax Service",
    support_email: "support@swtaxservice.com",
    website: "https://www.swtaxservice.com",
    waitlist_link: "https://www.swtaxservice.com/waitlist",
    first_name: "there",
    signature_name: "SW Tax Service Team",
    unsubscribe_link: unsubPageUrl,
    one_click_unsub_url: oneClickUrl,
    footer_html: footerHtml,
    footer_text: footerText,

    logo_url: "https://www.swtaxservice.com/swtax-favicon-pack/android-chrome-512x512.png",
    logo_alt: "SW Tax Service",
    logo_link: "https://www.swtaxservice.com",

    // ✅ IMPORTANT: use NUMBER (not "72px")
    logo_width: 72,
  } as Record<string, any>;
}

async function markCampaignStatus(campaignId: string, patch: any) {
  await db.update(emailCampaigns).set(patch).where(eq(emailCampaigns.id, campaignId));
}

/**
 * ✅ Send NOW (Direct Resend)
 * Sends multiple batches until:
 * - no more queued, OR
 * - MAX_PER_RUN reached
 */
export async function sendNowDirectResend(campaignId: string) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId missing");

  const { campaign, htmlTpl, textTpl, templateHasFooterHtml, templateHasFooterText } =
    await getCampaign(id);

  if (String(campaign.status) === "sent") {
    throw new Error("Campaign is already marked sent.");
  }

  await markCampaignStatus(id, {
    status: "sending" as any,
    updatedAt: new Date(),
    sentAt: null,
  } as any);

  let processed = 0;

  while (processed < MAX_PER_RUN) {
    const recipients = await claimQueuedBatch(id);
    if (!recipients.length) break;

    for (const r of recipients) {
      const to = String(r.email ?? "").toLowerCase().trim();

      if (!to) {
        await db
          .update(emailRecipients)
          .set({
            status: "failed" as any,
            error: "Missing email",
            updatedAt: new Date(),
          } as any)
          .where(eq(emailRecipients.id, r.id));
        continue;
      }

      const unsubToken = String(r.unsubToken ?? "").trim() || makeToken();
      if (!r.unsubToken) {
        await db
          .update(emailRecipients)
          .set({ unsubToken, updatedAt: new Date() } as any)
          .where(eq(emailRecipients.id, r.id));
      }

      const { pageUrl, oneClickUrl } = buildUnsubUrls(unsubToken);

      const footerHtml = buildEmailFooterHTML("marketing", {
        companyName: "SW Tax Service",
        addressLine: "Las Vegas, NV",
        supportEmail: "support@swtaxservice.com",
        website: "https://www.swtaxservice.com",
        unsubUrl: pageUrl,
        includeDivider: false,
        includeUnsubscribe: true,
      });

      const footerText = buildEmailFooterText("marketing", {
        companyName: "SW Tax Service",
        addressLine: "Las Vegas, NV",
        supportEmail: "support@swtaxservice.com",
        website: "https://www.swtaxservice.com",
        unsubUrl: pageUrl,
      });

      const vars = buildVars({
        unsubPageUrl: pageUrl,
        oneClickUrl,
        footerHtml,
        footerText,
      });

      try {
        const renderedSubject = renderTemplate(String(campaign.subject ?? ""), vars);

        let renderedHtml = renderTemplate(htmlTpl, vars);
        let renderedText = textTpl
          ? renderTemplate(textTpl, vars)
          : htmlToText(renderedHtml, { wordwrap: 90 });

        if (!templateHasFooterHtml) renderedHtml = `${renderedHtml}\n\n${footerHtml}`;
        if (!templateHasFooterText) renderedText = `${renderedText}\n\n${footerText}`;

        if (
          hasUnrenderedTokens(renderedSubject) ||
          hasUnrenderedTokens(renderedHtml) ||
          hasUnrenderedTokens(renderedText)
        ) {
          throw new Error("Template contains unknown {{tokens}}.");
        }

        await sendResendEmail({
          to,
          subject: renderedSubject,
          htmlBody: renderedHtml,
          textBody: renderedText || undefined,
          replyTo: REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${oneClickUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "X-SWTS-Campaign-Id": id,
            "X-SWTS-Recipient-Id": String(r.id),
          },
        });

        await db
          .update(emailRecipients)
          .set({
            status: "sent" as any,
            sentAt: new Date(),
            error: null,
            updatedAt: new Date(),
          } as any)
          .where(eq(emailRecipients.id, r.id));
      } catch (err: any) {
        await db
          .update(emailRecipients)
          .set({
            status: "failed" as any,
            error: String(err?.message ?? err ?? "Send failed"),
            updatedAt: new Date(),
          } as any)
          .where(eq(emailRecipients.id, r.id));
      }
    }

    processed += recipients.length;
  }

  // If nothing left queued/sending, mark campaign as sent
  const [remaining] = await db
    .select({
      open: sql<number>`sum(case when ${emailRecipients.status} in ('queued','sending') then 1 else 0 end)::int`,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, id));

  if ((remaining?.open ?? 0) === 0) {
    await markCampaignStatus(id, {
      status: "sent" as any,
      sentAt: new Date(),
      updatedAt: new Date(),
    } as any);
  } else {
    // keep it in sending; user can click Send Now again to continue
    await markCampaignStatus(id, { status: "sending" as any, updatedAt: new Date() } as any);
  }

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}

/**
 * ✅ Schedule (Direct Resend)
 * Schedules emails in Resend AND locks recipients in DB
 * so your runner/other actions won’t pick them up again.
 */
export async function scheduleDirectResend(
  campaignId: string,
  sendAtOrForm: string | FormData
) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId missing");

  const sendAtIso =
    typeof sendAtOrForm === "string"
      ? String(sendAtOrForm ?? "").trim()
      : String(sendAtOrForm.get("sendAtIso") ?? sendAtOrForm.get("sendAt") ?? "").trim();

  const sendAtLocal =
    typeof sendAtOrForm === "string"
      ? ""
      : String(sendAtOrForm.get("sendAtLocal") ?? "").trim();

  if (!sendAtIso) throw new Error("Pick a date/time.");

  const sendAt = new Date(sendAtIso);
  if (Number.isNaN(sendAt.getTime())) {
    throw new Error(`Invalid date/time. (local="${sendAtLocal}", iso="${sendAtIso}")`);
  }

  assertResendWindow(sendAt);

  const { campaign, htmlTpl, textTpl, templateHasFooterHtml, templateHasFooterText } =
    await getCampaign(id);

  if (String(campaign.status) === "sent") {
    throw new Error("Campaign is already marked sent.");
  }

  const scheduledAt = sendAt.toISOString();

  // Mark campaign as scheduled in YOUR DB too (UI)
  await markCampaignStatus(id, {
    status: "scheduled" as any,
    scheduledAt: sendAt,
    schedulerName: "resend",
    sentAt: null,
    updatedAt: new Date(),
  } as any);

  let processed = 0;

  while (processed < MAX_PER_RUN) {
    const recipients = await claimQueuedBatch(id);
    if (!recipients.length) break;

    for (const r of recipients) {
      const to = String(r.email ?? "").toLowerCase().trim();
      if (!to) continue;

      const unsubToken = String(r.unsubToken ?? "").trim() || makeToken();
      if (!r.unsubToken) {
        await db
          .update(emailRecipients)
          .set({ unsubToken, updatedAt: new Date() } as any)
          .where(eq(emailRecipients.id, r.id));
      }

      const { pageUrl, oneClickUrl } = buildUnsubUrls(unsubToken);

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

      const vars = buildVars({
        unsubPageUrl: pageUrl,
        oneClickUrl,
        footerHtml,
        footerText,
      });

      try {
        const renderedSubject = renderTemplate(String(campaign.subject ?? ""), vars);

        let renderedHtml = renderTemplate(htmlTpl, vars);
        let renderedText = textTpl
          ? renderTemplate(textTpl, vars)
          : htmlToText(renderedHtml, { wordwrap: 90 });

        if (!templateHasFooterHtml) renderedHtml = `${renderedHtml}\n\n${footerHtml}`;
        if (!templateHasFooterText) renderedText = `${renderedText}\n\n${footerText}`;

        if (
          hasUnrenderedTokens(renderedSubject) ||
          hasUnrenderedTokens(renderedHtml) ||
          hasUnrenderedTokens(renderedText)
        ) {
          throw new Error("Template contains unknown {{tokens}}.");
        }

        await sendResendEmail({
          to,
          subject: renderedSubject,
          htmlBody: renderedHtml,
          textBody: renderedText || undefined,
          replyTo: REPLY_TO,
          scheduledAt,
          headers: {
            "List-Unsubscribe": `<${oneClickUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "X-SWTS-Campaign-Id": id,
            "X-SWTS-Recipient-Id": String(r.id),
          },
        });

        // ✅ Keep as "sending" so nothing else re-queues it.
        // Store a helpful note so you can see it in your logs UI.
        await db
          .update(emailRecipients)
          .set({
            status: "sending" as any,
            error: `Scheduled in Resend for ${scheduledAt}`,
            updatedAt: new Date(),
          } as any)
          .where(eq(emailRecipients.id, r.id));
      } catch (err: any) {
        await db
          .update(emailRecipients)
          .set({
            status: "failed" as any,
            error: String(err?.message ?? err ?? "Schedule failed"),
            updatedAt: new Date(),
          } as any)
          .where(eq(emailRecipients.id, r.id));
      }
    }

    processed += recipients.length;
  }

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}
