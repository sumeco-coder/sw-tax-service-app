// amplify/functions/emailCampaignRunner/handler.ts
import pg from "pg";

import { sendEmail } from "../../../lib/email/sendEmail";
import { renderTemplate, hasUnrenderedTokens } from "../../../lib/helpers/render-template";
import { renderHandlebars, isMjml, compileMjmlToHtml } from "../../../lib/email/templateEngine";
import { buildEmailFooterHTML, buildEmailFooterText, buildEmailFooterMJML } from "../../../lib/email/footer";

const { Pool } = pg;

// ✅ Batch settings
const BATCH_SIZE = Number(process.env.EMAIL_SEND_BATCH_SIZE ?? 50);

// ✅ Safety (don’t run forever)
const MAX_MS = Number(process.env.EMAIL_RUNNER_MAX_MS ?? 10 * 60 * 1000); // 10 min

// ✅ Crash recovery: reset stale "sending" recipients back to "queued"
const STALE_SENDING_MINUTES = Number(process.env.EMAIL_STALE_SENDING_MINUTES ?? 30);

const REPLY_TO = "support@swtaxservice.com";

function getSiteUrl() {
  const base = process.env.SITE_URL ?? process.env.APP_URL ?? "https://www.swtaxservice.com";
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
  const started = Date.now();
  console.log("[emailCampaignRunner] start", new Date().toISOString(), {
    batchSize: BATCH_SIZE,
    maxMs: MAX_MS,
    requestedCampaignId: typeof event?.campaignId === "string" ? event.campaignId : null,
  });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing");

  // If your RDS requires SSL, you can enable this:
  // const ssl =
  //   process.env.PGSSLMODE === "require"
  //     ? { rejectUnauthorized: false }
  //     : undefined;

  const pool = new Pool({
    connectionString: dbUrl,
    // ssl,
  });

  const requestedCampaignId =
    typeof event?.campaignId === "string" ? event.campaignId : undefined;

  let totalClaimed = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let totalUnsub = 0;

  try {
    // ✅ 0) Reset stale "sending" recipients back to queued (crash recovery)
    const staleRes = await pool.query(
      `update email_recipients
       set status = 'queued', updated_at = now(), error = coalesce(error,'')
       where status = 'sending'
         and updated_at < (now() - ($1 || ' minutes')::interval)
       returning id`,
      [String(STALE_SENDING_MINUTES)]
    );
    if (staleRes?.rowCount) {
      console.log("[emailCampaignRunner] reset stale sending -> queued", staleRes.rowCount);
    }

    // ✅ 1) Promote any due scheduled campaigns -> sending
    const promoRes = await pool.query(
      `update email_campaigns
       set status = 'sending', updated_at = now()
       where status = 'scheduled'
         and scheduled_at is not null
         and scheduled_at <= now()
       returning id`
    );
    if (promoRes?.rowCount) {
      console.log("[emailCampaignRunner] promoted scheduled -> sending", promoRes.rowCount);
    }

    // Loop until we hit time budget
    while (Date.now() - started < MAX_MS) {
      if (Date.now() - started > MAX_MS - 60_000) {
        console.log("[emailCampaignRunner] near timeout, exiting to continue next tick");
        return { ok: true, message: "Near timeout, exiting (will continue next schedule tick)" };
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
        const msg = requestedCampaignId ? "Requested campaign is not sending." : "No campaigns sending";
        console.log("[emailCampaignRunner] stop:", msg);
        return { ok: true, message: msg };
      }

      // ✅ 3) Claim next batch atomically
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

      totalClaimed += claimRes.rows.length;

      // ✅ If nothing left queued, finalize campaign
      if (claimRes.rows.length === 0) {
        await pool.query(
          `update email_campaigns
           set status = 'sent', sent_at = now(), updated_at = now()
           where id = $1`,
          [campaign.id]
        );

        console.log("[emailCampaignRunner] campaign completed", { campaignId: campaign.id });

        if (requestedCampaignId) return { ok: true, message: "Campaign completed" };
        continue;
      }

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
        for (const row of unsubRes.rows) if (row?.email) unsubSet.add(String(row.email));
      }

      const templateHasFooterHtml = String(campaign.html_body ?? "").includes("{{footer_html}}");
      const templateHasFooterText = String(campaign.text_body ?? "").includes("{{footer_text}}");

      for (const r of claimRes.rows) {
        const to = String(r.email ?? "").toLowerCase().trim();

        if (!to) {
          totalFailed++;
          await pool.query(
            `update email_recipients
             set status = 'failed', updated_at = now(), error = 'Missing email'
             where id = $1`,
            [r.id]
          );
          continue;
        }

        if (unsubSet.has(to)) {
          totalUnsub++;
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
          totalFailed++;
          await pool.query(
            `update email_recipients
             set status = 'failed', updated_at = now(), error = 'Missing unsubscribe token'
             where id = $1`,
            [r.id]
          );
          continue;
        }

        const { pageUrl, oneClickUrl } = buildUnsubUrls(token);

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
          logo_url: "https://www.swtaxservice.com/swtax-favicon-pack/android-chrome-512x512.png",
          logo_alt: "SW Tax Service",
          logo_link: "https://www.swtaxservice.com",
          logo_width: "72px",
        };

        const subject = renderTemplate(String(campaign.subject ?? ""), vars);

        const firstPass = renderHandlebars(String(campaign.html_body ?? ""), vars);
        const bodyIsMjml = isMjml(firstPass);

        const footerForTemplate = bodyIsMjml ? footerMjml : footerHtml;
        const vars2 = { ...vars, footer_html: footerForTemplate };

        const rendered = renderHandlebars(String(campaign.html_body ?? ""), vars2);
        let htmlBody = isMjml(rendered) ? compileMjmlToHtml(rendered) : rendered;

        let textBody = renderTemplate(String(campaign.text_body ?? ""), vars2);

        if (!bodyIsMjml && !templateHasFooterHtml) htmlBody = `${htmlBody}\n\n${footerHtml}`;
        if (!templateHasFooterText) textBody = `${textBody}\n\n${footerText}`;

        if (hasUnrenderedTokens(subject) || hasUnrenderedTokens(htmlBody) || hasUnrenderedTokens(textBody)) {
          totalFailed++;
          await pool.query(
            `update email_recipients
             set status = 'failed', updated_at = now(), error = 'Template contains unknown {{tokens}}.'
             where id = $1`,
            [r.id]
          );
          continue;
        }

        try {
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

          totalSent++;
          await pool.query(
            `update email_recipients
             set status = 'sent', sent_at = now(), updated_at = now(), error = null
             where id = $1`,
            [r.id]
          );
        } catch (e: any) {
          totalFailed++;
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
    const ms = Date.now() - started;
    console.log("[emailCampaignRunner] done", { ms, totalClaimed, totalSent, totalFailed, totalUnsub });
    await pool.end();
  }
};
