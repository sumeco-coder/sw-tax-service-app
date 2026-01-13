// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/actions/send-actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients, invites } from "@/drizzle/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sendResendEmail } from "@/lib/email/resend.server";
import { renderTemplate, hasUnrenderedTokens } from "@/lib/helpers/render-template";
import { htmlToText } from "html-to-text";
import { buildEmailFooterHTML, buildEmailFooterText } from "@/lib/email/footer";

const BATCH_SIZE = 200;
const MAX_PER_RUN = 2000;
const REPLY_TO = "support@swtaxservice.com";

/* ---------------------------
   Helpers
---------------------------- */
function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function makeToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function getSiteUrl() {
  const base =
    process.env.APP_ORIGIN ??
    process.env.APP_URL ??
    process.env.SITE_URL ??
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
  const max = Date.now() + 30 * 24 * 60 * 60 * 1000;
  if (sendAt.getTime() < Date.now() + 60_000) {
    throw new Error("Send time must be at least 1 minute in the future.");
  }
  if (sendAt.getTime() > max) {
    throw new Error("Resend can only schedule up to 30 days in advance.");
  }
}

function fmtInviteExpires(expiresAt: unknown) {
  if (!expiresAt) return "";
  const d = expiresAt instanceof Date ? expiresAt : new Date(expiresAt as any);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function templateNeedsInviteTokens(subject: string, htmlTpl: string, textTpl: string) {
  const blob = `${subject}\n${htmlTpl}\n${textTpl}`;
  return /{{\s*(invite_link|sign_in_link|portal_link|invite_token|invite_expires_at|expires_text|sign_in_url|sign_up_url|onboarding_sign_up_url)\s*}}/i.test(
    blob
  );
}


/**
 * ✅ Prevent duplicate INVITES (concurrency safe):
 * - reuse latest pending, unexpired invite (type=taxpayer) for that email
 * - otherwise create a new one
 */
async function ensureTaxpayerInvite(emailRaw: string, meta: Record<string, any>) {
  const email = normalizeEmail(emailRaw);
  if (!email) throw new Error("Missing email");

  const now = new Date();

  return db.transaction(async (tx) => {
    // ✅ Prevent duplicates under concurrency (per-email lock)
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${email}))`);

    // reuse existing pending + unexpired
    const existing = await tx
      .select({
        token: invites.token,
        expiresAt: invites.expiresAt,
      })
      .from(invites)
      .where(
        and(
          sql`lower(${invites.email}) = ${email}`,
          eq(invites.type as any, "taxpayer" as any),
          eq(invites.status as any, "pending" as any),
          sql`${invites.expiresAt} is null or ${invites.expiresAt} > now()`
        )
      )
      .orderBy(desc(invites.createdAt))
      .limit(1);

    if (existing?.[0]?.token) {
      return {
        token: String(existing[0].token),
        expiresAt: existing[0].expiresAt ?? null,
      };
    }

    const token = makeToken();

    const daysRaw = String(process.env.INVITE_EXPIRES_DAYS ?? "14");
    const days = Number(daysRaw);
    const expiresDays = Number.isFinite(days) ? days : 14;

    const expiresAt = new Date(now.getTime() + expiresDays * 24 * 60 * 60 * 1000);

    await tx.insert(invites).values({
      email,
      type: "taxpayer" as any,
      token,
      status: "pending" as any,
      expiresAt,
      meta: meta as any,
      createdAt: now,
      updatedAt: now,
    } as any);

    return { token, expiresAt };
  });
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

async function loadQueuedBatch(campaignId: string) {
  return db
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
}

/**
 * ✅ Build vars per recipient
 * Only creates invites IF the template needs invite tokens.
 */
async function buildVarsForRecipient(opts: {
  campaignId: string;
  email: string;
  inviteRequired: boolean;
  unsubPageUrl: string;
  oneClickUrl: string;
  footerHtml: string;
  footerText: string;
}) {
  const {
    campaignId,
    email,
    inviteRequired,
    unsubPageUrl,
    oneClickUrl,
    footerHtml,
    footerText,
  } = opts;

  const base = getSiteUrl();

  const AFTER_ONBOARDING_NEXT = "/dashboard";

  // defaults (non-invite templates)
  let invite_token = "";
  let invite_expires_at = "";

  // ✅ canonical URLs you want templates to use
  let onboarding_sign_up_url = `${base}/sign-up`;
  let sign_in_url = `${base}/sign-in`;

  // ✅ legacy placeholders (keep templates backward compatible)
  let invite_link = onboarding_sign_up_url; // older templates
  let sign_up_url = onboarding_sign_up_url; // older templates
  let sign_in_link = sign_in_url;           // older templates
  let portal_link = sign_in_url;            // generic CTA used by some templates

  if (inviteRequired) {
    const invite = await ensureTaxpayerInvite(email, {
      source: "directResend",
      campaignId,
    });

    invite_token = invite.token;
    invite_expires_at = fmtInviteExpires(invite.expiresAt);

    // ✅ "Create account" should go directly to onboarding-sign-up (your invite signup page)
    onboarding_sign_up_url = `${base}/taxpayer/onboarding-sign-up?invite=${encodeURIComponent(
      invite_token
    )}&next=${encodeURIComponent(AFTER_ONBOARDING_NEXT)}`;

    // ✅ "Sign in" should route through consume so revoked/expired is blocked cleanly
    sign_in_url = `${base}/invite/consume?token=${encodeURIComponent(
      invite_token
    )}&next=${encodeURIComponent(AFTER_ONBOARDING_NEXT)}`;

    // ✅ keep old naming working
    invite_link = onboarding_sign_up_url;
    sign_up_url = onboarding_sign_up_url;
    sign_in_link = sign_in_url;
    portal_link = sign_in_url;
  }

  return {
    company_name: "SW Tax Service",
    support_email: "support@swtaxservice.com",
    website: base,
    waitlist_link: `${base}/waitlist`,
    first_name: "there",
    signature_name: "SW Tax Service Team",

    // ✅ important: use the computed values (not hard-coded /sign-in and /sign-up)
    sign_in_url,
    sign_up_url,
    onboarding_sign_up_url,

    invite_token,
    invite_code: invite_token,

    invite_link,
    sign_in_link,
    portal_link,

    invite_expires_at,
    expires_text: invite_expires_at ? `Link expires: ${invite_expires_at}` : "",

    unsubscribe_link: unsubPageUrl,
    one_click_unsub_url: oneClickUrl,

    footer_html: footerHtml,
    footer_text: footerText,

    logo_url: `${base}/swtax-favicon-pack/android-chrome-512x512.png`,
    logo_alt: "SW Tax Service",
    logo_link: base,
    logo_width: 72,
  } as Record<string, any>;
}


async function markCampaignStatus(campaignId: string, patch: any) {
  await db.update(emailCampaigns).set(patch).where(eq(emailCampaigns.id, campaignId));
}

/**
 * ✅ Send NOW (Direct Resend) — NO DUPLICATES
 */
export async function sendNowDirectResend(campaignId: string) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId missing");

  const { campaign, htmlTpl, textTpl, templateHasFooterHtml, templateHasFooterText } =
    await getCampaign(id);

  if (String(campaign.status) === "sent") throw new Error("Campaign is already marked sent.");
  if (String(campaign.status) === "sending") {
    throw new Error(
      "This campaign is in runner mode (status='sending'). Set it back to draft/scheduled before using Direct Resend."
    );
  }

  const inviteRequired = templateNeedsInviteTokens(
    String(campaign.subject ?? ""),
    htmlTpl,
    textTpl
  );

  const alreadySentRows = await db
    .select({ e: sql<string>`lower(${emailRecipients.email})` })
    .from(emailRecipients)
    .where(and(eq(emailRecipients.campaignId, id), eq(emailRecipients.status as any, "sent" as any)));

  const alreadySent = new Set(alreadySentRows.map((r) => String(r.e ?? "").trim()).filter(Boolean));

  let processed = 0;

  while (processed < MAX_PER_RUN) {
    const recipients = await loadQueuedBatch(id);
    if (!recipients.length) break;

    const seenThisRun = new Set<string>();

    for (const r of recipients) {
      const to = normalizeEmail(r.email);

      if (!to) {
        await db.update(emailRecipients).set({
          status: "failed" as any,
          error: "Missing email",
          updatedAt: new Date(),
        } as any).where(eq(emailRecipients.id, r.id));
        continue;
      }

      if (alreadySent.has(to)) {
        await db.update(emailRecipients).set({
          status: "sent" as any,
          sentAt: new Date(),
          error: "Skipped (duplicate email already sent in this campaign)",
          updatedAt: new Date(),
        } as any).where(eq(emailRecipients.id, r.id));
        continue;
      }

      if (seenThisRun.has(to)) {
        await db.update(emailRecipients).set({
          status: "sent" as any,
          sentAt: new Date(),
          error: "Skipped (duplicate email in this batch)",
          updatedAt: new Date(),
        } as any).where(eq(emailRecipients.id, r.id));
        continue;
      }

      seenThisRun.add(to);

      const unsubToken = String(r.unsubToken ?? "").trim() || makeToken();
      if (!r.unsubToken) {
        await db.update(emailRecipients).set({ unsubToken, updatedAt: new Date() } as any)
          .where(eq(emailRecipients.id, r.id));
      }

      const { pageUrl, oneClickUrl } = buildUnsubUrls(unsubToken);

      const footerHtml = buildEmailFooterHTML("marketing", {
        companyName: "SW Tax Service",
        addressLine: "Las Vegas, NV",
        supportEmail: "support@swtaxservice.com",
        website: getSiteUrl(),
        unsubUrl: pageUrl,
        includeDivider: false,
        includeUnsubscribe: true,
      });

      const footerText = buildEmailFooterText("marketing", {
        companyName: "SW Tax Service",
        addressLine: "Las Vegas, NV",
        supportEmail: "support@swtaxservice.com",
        website: getSiteUrl(),
        unsubUrl: pageUrl,
      });

      const vars = await buildVarsForRecipient({
        campaignId: id,
        email: to,
        inviteRequired,
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

        alreadySent.add(to);

        await db.update(emailRecipients).set({
          status: "sent" as any,
          sentAt: new Date(),
          error: null,
          updatedAt: new Date(),
        } as any).where(eq(emailRecipients.id, r.id));
      } catch (err: any) {
        await db.update(emailRecipients).set({
          status: "failed" as any,
          error: String(err?.message ?? err ?? "Send failed"),
          updatedAt: new Date(),
        } as any).where(eq(emailRecipients.id, r.id));
      }
    }

    processed += recipients.length;
  }

  const [remaining] = await db
    .select({
      open: sql<number>`coalesce(sum(case when ${emailRecipients.status} = 'queued' then 1 else 0 end),0)::int`,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, id));

  if ((remaining?.open ?? 0) === 0) {
    await markCampaignStatus(id, { status: "sent" as any, sentAt: new Date(), updatedAt: new Date() } as any);
  } else {
    await markCampaignStatus(id, { updatedAt: new Date() } as any);
  }

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}

/**
 * ✅ Schedule (Direct Resend) — NO DUPLICATES
 */
export async function scheduleDirectResend(campaignId: string, sendAtOrForm: string | FormData) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId missing");

  const sendAtIso =
    typeof sendAtOrForm === "string"
      ? String(sendAtOrForm ?? "").trim()
      : String(sendAtOrForm.get("sendAtIso") ?? sendAtOrForm.get("sendAt") ?? "").trim();

  const sendAtLocal =
    typeof sendAtOrForm === "string" ? "" : String(sendAtOrForm.get("sendAtLocal") ?? "").trim();

  if (!sendAtIso) throw new Error("Pick a date/time.");

  const sendAt = new Date(sendAtIso);
  if (Number.isNaN(sendAt.getTime())) {
    throw new Error(`Invalid date/time. (local="${sendAtLocal}", iso="${sendAtIso}")`);
  }

  assertResendWindow(sendAt);

  const { campaign, htmlTpl, textTpl, templateHasFooterHtml, templateHasFooterText } =
    await getCampaign(id);

  if (String(campaign.status) === "sent") throw new Error("Campaign is already marked sent.");
  if (String(campaign.status) === "sending") {
    throw new Error(
      "This campaign is in runner mode (status='sending'). Set it back to draft/scheduled before using Direct Resend."
    );
  }

  const inviteRequired = templateNeedsInviteTokens(
    String(campaign.subject ?? ""),
    htmlTpl,
    textTpl
  );

  const scheduledAt = sendAt.toISOString();

  await markCampaignStatus(id, {
    status: "scheduled" as any,
    scheduledAt: sendAt,
    schedulerName: "resend",
    sentAt: null,
    updatedAt: new Date(),
  } as any);

  const alreadySentRows = await db
    .select({ e: sql<string>`lower(${emailRecipients.email})` })
    .from(emailRecipients)
    .where(and(eq(emailRecipients.campaignId, id), eq(emailRecipients.status as any, "sent" as any)));

  const alreadySent = new Set(alreadySentRows.map((r) => String(r.e ?? "").trim()).filter(Boolean));

  let processed = 0;

  while (processed < MAX_PER_RUN) {
    const recipients = await loadQueuedBatch(id);
    if (!recipients.length) break;

    const seenThisRun = new Set<string>();

    for (const r of recipients) {
      const to = normalizeEmail(r.email);
      if (!to) continue;

      if (alreadySent.has(to)) {
        await db.update(emailRecipients).set({
          status: "sent" as any,
          sentAt: sendAt,
          error: "Skipped (duplicate email already sent in this campaign)",
          updatedAt: new Date(),
        } as any).where(eq(emailRecipients.id, r.id));
        continue;
      }

      if (seenThisRun.has(to)) {
        await db.update(emailRecipients).set({
          status: "sent" as any,
          sentAt: sendAt,
          error: "Skipped (duplicate email in this batch)",
          updatedAt: new Date(),
        } as any).where(eq(emailRecipients.id, r.id));
        continue;
      }

      seenThisRun.add(to);

      const unsubToken = String(r.unsubToken ?? "").trim() || makeToken();
      if (!r.unsubToken) {
        await db.update(emailRecipients).set({ unsubToken, updatedAt: new Date() } as any)
          .where(eq(emailRecipients.id, r.id));
      }

      const { pageUrl, oneClickUrl } = buildUnsubUrls(unsubToken);

      const footerHtml = buildEmailFooterHTML("marketing", {
        companyName: "SW Tax Service",
        addressLine: "Las Vegas, NV",
        supportEmail: "support@swtaxservice.com",
        website: getSiteUrl(),
        unsubUrl: pageUrl,
      });

      const footerText = buildEmailFooterText("marketing", {
        companyName: "SW Tax Service",
        addressLine: "Las Vegas, NV",
        supportEmail: "support@swtaxservice.com",
        website: getSiteUrl(),
        unsubUrl: pageUrl,
      });

      const vars = await buildVarsForRecipient({
        campaignId: id,
        email: to,
        inviteRequired,
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

        alreadySent.add(to);

        await db.update(emailRecipients).set({
          status: "sent" as any,
          sentAt: sendAt,
          error: `Scheduled in Resend for ${scheduledAt}`,
          updatedAt: new Date(),
        } as any).where(eq(emailRecipients.id, r.id));
      } catch (err: any) {
        await db.update(emailRecipients).set({
          status: "failed" as any,
          error: String(err?.message ?? err ?? "Schedule failed"),
          updatedAt: new Date(),
        } as any).where(eq(emailRecipients.id, r.id));
      }
    }

    processed += recipients.length;
  }

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}
