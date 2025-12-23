// amplify/functions/emailCampaignRunner/handler.ts
import pg from "pg";

import { sendEmail } from "../../../lib/email/sendEmail";

import {
  renderTemplate,
  hasUnrenderedTokens,
} from "../../../lib/helpers/render-template";
import {
  renderHandlebars,
  isMjml,
  compileMjmlToHtml,
} from "../../../lib/email/templateEngine";
import {
  buildEmailFooterHTML,
  buildEmailFooterText,
  buildEmailFooterMJML,
} from "../../../lib/email/footer";

const { Pool } = pg;

/**
 * ENV you should have:
 * - DATABASE_URL
 * - RESEND_API_KEY (needed for Resend, and also SES fallback)
 * - RESEND_FROM_EMAIL (optional, used by lib/email/resend.ts)
 * - EMAIL_PROVIDER (optional) "resend" (default) or "ses"
 *
 * - SITE_URL (optional, used for unsubscribe links)
 * - EMAIL_SEND_BATCH_SIZE (optional)
 * - EMAIL_RUNNER_MAX_MS (optional)
 * - EMAIL_STALE_SENDING_MINUTES (optional)
 *
 * Cheapest mode:
 * - schedule this function "every 5m"
 * - NO AWS Scheduler continuation logic
 */

// ✅ Batch settings
const BATCH_SIZE = Number(process.env.EMAIL_SEND_BATCH_SIZE ?? 50);

// ✅ Safety (don’t run forever)
const MAX_MS = Number(process.env.EMAIL_RUNNER_MAX_MS ?? 10 * 60 * 1000); // 10 min

// ✅ Crash recovery: reset stale "sending" recipients back to "queued"
const STALE_SENDING_MINUTES = Number(
  process.env.EMAIL_STALE_SENDING_MINUTES ?? 30
);

const REPLY_TO = "support@swtaxservice.com";

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

export const handler = async (event: any = {}) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing");

  const pool = new Pool({ connectionString: dbUrl });

  const started = Date.now();
  const requestedCampaignId =
    typeof event?.campaignId === "string" ? event.campaignId : undefined;

  try {
    // ✅ 0) Reset stale "sending" recipients back to queued (crash recovery)
    await pool.query(
      `update email_recipients
       set status = 'queued', updated_at = now(), error = coalesce(error,'')
       where status = 'sending'
         and updated_at < (now() - ($1 || ' minutes')::interval)`,
      [String(STALE_SENDING_MINUTES)]
    );

    // ✅ 1) Promote any due scheduled campaigns -> sending
    await pool.query(
      `update email_campaigns
       set status = 'sending', updated_at = now()
       where status = 'scheduled'
         and scheduled_at is not null
         and scheduled_at <= now()`
    );

    // Loop until we hit time budget
    while (Date.now() - started < MAX_MS) {
      // ✅ If we're close to timeout, stop.
      // Next scheduled run (every 5m) will continue where we left off.
      if (Date.now() - started > MAX_MS - 60_000) {
        return {
          ok: true,
          message: "Near timeout, exiting (will continue next schedule tick)",
        };
      }

      // ✅ 2) Get a campaign that is currently sending
      const campaignRes = requestedCampaignId
        ? await pool.query(
            `select id, subject, html_body, text_body
             from email_campaigns
             where id = $1 and status = 'sending'
             limit 1`,
            [requestedCampaignId]
          )
        : await pool.query(
            `select id, subject, html_body, text_body
             from email_campaigns
             where status = 'sending'
             order by updated_at asc
             limit 1`
          );

      const campaign = campaignRes.rows[0];
      if (!campaign) {
        return {
          ok: true,
          message: requestedCampaignId
            ? "Requested campaign is not sending."
            : "No campaigns sending",
        };
      }

      // ✅ 3) Claim next batch atomically (prevents duplicates across concurrent runners)
      const claimRes = await pool.query(
        `with cte as (
           select id
           from email_recipients
           where campaign_id = $1 and status = 'queued'
           order by created_at asc
           limit $2
           for update skip locked
         )
         update email_recipients r
         set status = 'sending', updated_at = now(), error = null
         from cte
         where r.id = cte.id
         returning r.id, r.email, r.unsub_token`,
        [campaign.id, BATCH_SIZE]
      );

      // ✅ If nothing left queued, finalize campaign
      if (claimRes.rows.length === 0) {
        await pool.query(
          `update email_campaigns
           set status = 'sent', sent_at = now(), updated_at = now()
           where id = $1`,
          [campaign.id]
        );

        if (requestedCampaignId) {
          return { ok: true, message: "Campaign completed" };
        }

        continue;
      }

      // ---- Bulk unsub lookup (fast) ----
      const emails = claimRes.rows
        .map((r: any) => String(r.email ?? "").toLowerCase().trim())
        .filter(Boolean);

      const unsubSet = new Set<string>();
      if (emails.length) {
        const unsubRes = await pool.query(
          `select lower(email) as email
           from email_unsubscribes
           where lower(email) = any($1::text[])`,
          [emails]
        );

        for (const row of unsubRes.rows) {
          if (row?.email) unsubSet.add(String(row.email));
        }
      }

      // Detect footer tokens in stored templates
      const templateHasFooterHtml = String(campaign.html_body ?? "").includes(
        "{{footer_html}}"
      );
      const templateHasFooterText = String(campaign.text_body ?? "").includes(
        "{{footer_text}}"
      );

      for (const r of claimRes.rows) {
        const to = String(r.email ?? "").toLowerCase().trim();
        if (!to) {
          await pool.query(
            `update email_recipients
             set status = 'failed', updated_at = now(), error = 'Missing email'
             where id = $1`,
            [r.id]
          );
          continue;
        }

        // skip unsubscribed
        if (unsubSet.has(to)) {
          await pool.query(
            `update email_recipients
             set status = 'unsubscribed', updated_at = now(), error = 'Skipped (unsubscribed)'
             where id = $1`,
            [r.id]
          );
          continue;
        }

        const token = String(r.unsub_token ?? "");
        if (!token) {
          await pool.query(
            `update email_recipients
             set status = 'failed', updated_at = now(), error = 'Missing unsubscribe token'
             where id = $1`,
            [r.id]
          );
          continue;
        }

        const { pageUrl, oneClickUrl } = buildUnsubUrls(token);

        // Build footers (HTML/Text/MJML)
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

        // Vars available in templates
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

          logo_url:
            "https://www.swtaxservice.com/swtax-favicon-pack/android-chrome-512x512.png",
          logo_alt: "SW Tax Service",
          logo_link: "https://www.swtaxservice.com",
          logo_width: "72px",
        };

        // Subject render
        const subject = renderTemplate(String(campaign.subject ?? ""), vars);

        // 1) First-pass render (to detect MJML)
        const firstPass = renderHandlebars(
          String(campaign.html_body ?? ""),
          vars
        );
        const bodyIsMjml = isMjml(firstPass);

        // 2) Choose correct footer format for {{footer_html}}
        const footerForTemplate = bodyIsMjml ? footerMjml : footerHtml;

        // 3) Final render with correct footer format
        const vars2 = { ...vars, footer_html: footerForTemplate };
        const rendered = renderHandlebars(
          String(campaign.html_body ?? ""),
          vars2
        );

        // 4) Compile if MJML
        let htmlBody = isMjml(rendered) ? compileMjmlToHtml(rendered) : rendered;

        // Text render
        let textBody = renderTemplate(String(campaign.text_body ?? ""), vars2);

        // Append footers only when stored campaign body is NOT MJML
        // (MJML needs structural insertion; prefer using {{footer_html}} in MJML templates.)
        if (!bodyIsMjml && !templateHasFooterHtml) {
          htmlBody = `${htmlBody}\n\n${footerHtml}`;
        }
        if (!templateHasFooterText) {
          textBody = `${textBody}\n\n${footerText}`;
        }

        // Token safety
        if (
          hasUnrenderedTokens(subject) ||
          hasUnrenderedTokens(htmlBody) ||
          hasUnrenderedTokens(textBody)
        ) {
          await pool.query(
            `update email_recipients
             set status = 'failed', updated_at = now(), error = 'Template contains unknown {{tokens}}.'
             where id = $1`,
            [r.id]
          );
          continue;
        }

        try {
          // ✅ Option A: Unified sender (SES-first if EMAIL_PROVIDER=ses, else Resend)
          await sendEmail({
            to,
            subject,
            htmlBody,
            textBody: textBody || undefined,
            replyTo: REPLY_TO,
            headers: {
              "List-Unsubscribe": `<${oneClickUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });

          await pool.query(
            `update email_recipients
             set status = 'sent', sent_at = now(), updated_at = now(), error = null
             where id = $1`,
            [r.id]
          );
        } catch (e: any) {
          await pool.query(
            `update email_recipients
             set status = 'failed', updated_at = now(), error = $2
             where id = $1`,
            [r.id, String(e?.message ?? e)]
          );
        }
      }
    }

    return { ok: true, message: "Max runtime reached" };
  } finally {
    await pool.end();
  }
};
