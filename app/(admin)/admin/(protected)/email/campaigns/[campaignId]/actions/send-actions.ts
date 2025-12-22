"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sendResendEmail } from "@/lib/email/resend";
import { EMAIL_PARTIALS } from "@/lib/email/templatePartials";
import {
  renderHandlebars,
  isMjml,
  compileMjmlToHtml,
} from "@/lib/email/templateEngine";
import { htmlToText } from "html-to-text";
import {
  buildEmailFooterHTML,
  buildEmailFooterText,
  buildEmailFooterMJML,
} from "@/lib/email/footer";

const BATCH_SIZE = 200;
const REPLY_TO = "support@swtaxservice.com";

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function getSiteUrl() {
  const base =
    process.env.SITE_URL ??
    process.env.APP_URL ??
    "https://www.swtaxservice.com";
  return String(base).replace(/\/$/, "");
}

function buildUnsubUrls(token: string) {
  const base = getSiteUrl();
  return {
    pageUrl: `${base}/unsubscribe?token=${encodeURIComponent(token)}`,
    oneClickUrl: `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`,
  };
}

/**
 * Button A: Send Now (Runner)
 * - flips to scheduled and sets scheduledAt = now
 * - Amplify runner will pick it up on next tick
 */
export async function sendNowRunner(campaignId: string) {
  if (!campaignId) throw new Error("campaignId missing");

  const [q] = await db
    .select({ queued: sql<number>`count(*)::int` })
    .from(emailRecipients)
    .where(
      and(
        eq(emailRecipients.campaignId, campaignId),
        eq(emailRecipients.status, "queued")
      )
    );

  const queued = q?.queued ?? 0;
  if (queued <= 0) {
    throw new Error("No queued recipients. Click “Build recipients (queue)” first.");
  }

  await db
    .update(emailCampaigns)
    .set({
      status: "scheduled" as any,
      scheduledAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/logs");
  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${campaignId}`);
  redirect(`/admin/email/campaigns/${campaignId}`);
}

/**
 * Button B: Send Now (Direct Resend)
 * - sends up to BATCH_SIZE immediately via Resend
 * - IMPORTANT: renders handlebars + compiles MJML + builds footers (so logo shows)
 */
export async function sendNowDirectResend(campaignId: string) {
  if (!campaignId) throw new Error("campaignId missing");

  const [campaign] = await db
    .select({
      id: emailCampaigns.id,
      subject: emailCampaigns.subject,
      htmlBody: emailCampaigns.htmlBody,
      textBody: emailCampaigns.textBody,
    })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) throw new Error("Campaign not found");

  // ✅ pull queued recipients (include unsub token)
  const recipients = await db
    .select({
      id: emailRecipients.id,
      email: emailRecipients.email,
      unsubToken: (emailRecipients as any).unsubToken,
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
    throw new Error("No queued recipients. Click “Build recipients (queue)” first.");
  }

  // mark campaign sending
  await db
    .update(emailCampaigns)
    .set({
      status: "sending" as any,
      updatedAt: new Date(),
      sentAt: null,
    } as any)
    .where(eq(emailCampaigns.id, campaignId));

  // detect footer tokens in stored template (so we don’t double-append)
  const htmlTpl = String(campaign.htmlBody ?? "");
  const textTpl = String(campaign.textBody ?? "");

  const templateHasFooterHtml =
    htmlTpl.includes("{{footer_html}}") ||
    htmlTpl.includes("{{{footer_html}}}") ||
    htmlTpl.includes("{{> footer}}");

  const templateHasFooterText =
    textTpl.includes("{{footer_text}}") ||
    textTpl.includes("{{{footer_text}}}") ||
    textTpl.includes("{{> footer}}");

  for (const r of recipients) {
    const to = String(r.email ?? "").toLowerCase().trim();

    if (!to) {
      await db
        .update(emailRecipients)
        .set({
          status: "failed",
          error: "Missing email",
          updatedAt: new Date(),
        } as any)
        .where(eq(emailRecipients.id, r.id));
      continue;
    }

    // ensure unsub token exists (older rows might be missing)
    const unsubToken = String(r.unsubToken ?? "").trim() || makeToken();
    if (!r.unsubToken) {
      await db
        .update(emailRecipients)
        .set({ unsubToken, updatedAt: new Date() } as any)
        .where(eq(emailRecipients.id, r.id));
    }

    const { pageUrl, oneClickUrl } = buildUnsubUrls(unsubToken);

    // footers
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

    const footerMjml = buildEmailFooterMJML("marketing", {
      companyName: "SW Tax Service",
      addressLine: "Las Vegas, NV",
      supportEmail: "support@swtaxservice.com",
      website: "https://www.swtaxservice.com",
      unsubUrl: pageUrl,
    });

    // base vars (this is what makes logo appear)
    const vars: Record<string, any> = {
      company_name: "SW Tax Service",
      waitlist_link: "https://www.swtaxservice.com/waitlist",
      support_email: "support@swtaxservice.com",
      website: "https://www.swtaxservice.com",
      first_name: "there",
      signature_name: "SW Tax Service Team",

      unsubscribe_link: pageUrl,
      one_click_unsub_url: oneClickUrl,

      footer_text: footerText,

      logo_url:
        "https://www.swtaxservice.com/swtax-favicon-pack/android-chrome-512x512.png",
      logo_alt: "SW Tax Service",
      logo_link: "https://www.swtaxservice.com",
      logo_width: "72px",
    };

    try {
      // subject
      const renderedSubject = renderHandlebars(
        String(campaign.subject ?? ""),
        vars,
        EMAIL_PARTIALS
      );

      // html render pass 1 (detect MJML)
      const firstPass = renderHandlebars(htmlTpl, vars, EMAIL_PARTIALS);
      const bodyIsMjml = isMjml(firstPass);

      // choose correct footer format for footer_html
      const footerForTemplate = bodyIsMjml ? footerMjml : footerHtml;

      // final html render
      const renderedSource = renderHandlebars(
        htmlTpl,
        { ...vars, footer_html: footerForTemplate },
        EMAIL_PARTIALS
      );

      const renderedHtml = isMjml(renderedSource)
        ? compileMjmlToHtml(renderedSource)
        : renderedSource;

      // text
      let renderedText = "";
      if (textTpl.trim().length) {
        renderedText = renderHandlebars(
          textTpl,
          { ...vars, footer_html: footerForTemplate },
          EMAIL_PARTIALS
        );
      } else {
        renderedText = htmlToText(renderedHtml, { wordwrap: 90 });
      }

      // append footers only if template didn’t include them
      let finalHtml = renderedHtml;
      let finalText = renderedText;

      if (!bodyIsMjml && !templateHasFooterHtml) {
        finalHtml = `${finalHtml}\n\n${footerHtml}`;
      }
      if (!templateHasFooterText) {
        finalText = `${finalText}\n\n${footerText}`;
      }

      // save preview fields (optional — only if your schema has them)
      await db
        .update(emailRecipients)
        .set({
          renderedSubject,
          renderedHtml: finalHtml,
          renderedText: finalText,
          updatedAt: new Date(),
        } as any)
        .where(eq(emailRecipients.id, r.id));

      // ✅ send via Resend
      await sendResendEmail({
        to,
        subject: renderedSubject,
        htmlBody: finalHtml,
        textBody: finalText || undefined,
        replyTo: REPLY_TO,
        headers: {
          "List-Unsubscribe": `<${oneClickUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-SWTS-Campaign-Id": campaignId,
          "X-SWTS-Recipient-Id": String(r.id),
        },
      });

      await db
        .update(emailRecipients)
        .set({
          status: "sent",
          sentAt: new Date(),
          error: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(emailRecipients.id, r.id));
    } catch (err: any) {
      await db
        .update(emailRecipients)
        .set({
          status: "failed",
          error: String(err?.message ?? err ?? "Send failed"),
          updatedAt: new Date(),
        } as any)
        .where(eq(emailRecipients.id, r.id));
    }
  }

  // finalize campaign status
  const [left] = await db
    .select({ queued: sql<number>`count(*)::int` })
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
      status: (hasMoreQueued ? "sending" : "sent") as any,
      sentAt: hasMoreQueued ? null : new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/logs");
  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${campaignId}`);
  redirect(`/admin/email/campaigns/${campaignId}`);
}
