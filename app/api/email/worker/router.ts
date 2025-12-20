// app/api/email/worker/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/drizzle/db";
import {
  emailCampaigns,
  emailRecipients,
  emailUnsubscribes,
} from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderTemplate, hasUnrenderedTokens } from "@/lib/email/renderTemplate";
import { buildEmailFooterHTML, buildEmailFooterText } from "@/lib/email/footer";

function getAppUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function buildUnsubUrls(token: string) {
  const base = getAppUrl();
  return {
    pageUrl: `${base}/unsubscribe?token=${encodeURIComponent(token)}`,
    oneClickUrl: `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`,
  };
}

/**
 * Protect the worker so random people can’t trigger it.
 * Set EMAIL_WORKER_SECRET in env.
 */
function assertWorkerAuth(req: Request) {
  const secret = process.env.EMAIL_WORKER_SECRET;
  if (!secret) throw new Error("EMAIL_WORKER_SECRET is not set");

  const header = req.headers.get("x-worker-secret") ?? "";
  if (header !== secret) throw new Error("Unauthorized");
}

/**
 * POST /api/email/worker
 * Body: { campaignId?: string, limit?: number }
 */
export async function POST(req: Request) {
  try {
    assertWorkerAuth(req);

    const body = await req.json().catch(() => ({} as any));
    const campaignId = typeof body?.campaignId === "string" ? body.campaignId : undefined;
    const limit = Number(body?.limit ?? 50);

    // 1) find campaigns that are "sending" (or a single campaign)
    const campaigns = campaignId
      ? await db
          .select({
            id: emailCampaigns.id,
            subject: emailCampaigns.subject,
            htmlBody: emailCampaigns.htmlBody,
            textBody: emailCampaigns.textBody,
            status: emailCampaigns.status,
          })
          .from(emailCampaigns)
          .where(eq(emailCampaigns.id, campaignId))
          .limit(1)
      : await db
          .select({
            id: emailCampaigns.id,
            subject: emailCampaigns.subject,
            htmlBody: emailCampaigns.htmlBody,
            textBody: emailCampaigns.textBody,
            status: emailCampaigns.status,
          })
          .from(emailCampaigns)
          .where(eq(emailCampaigns.status, "sending"))
          .limit(10);

    if (!campaigns.length) {
      return NextResponse.json({ ok: true, message: "No sending campaigns." });
    }

    let totalSent = 0;
    let totalFailed = 0;
    let totalProcessed = 0;

    for (const c of campaigns) {
      if (!c?.id) continue;

      // 2) pull queued recipients
      const recipients = await db
        .select({
          id: emailRecipients.id,
          email: emailRecipients.email,
          unsubToken: emailRecipients.unsubToken,
        })
        .from(emailRecipients)
        .where(and(eq(emailRecipients.campaignId, c.id), eq(emailRecipients.status, "queued")))
        .limit(limit);

      if (!recipients.length) {
        // If nothing queued, mark campaign done (sent)
        await db
          .update(emailCampaigns)
          .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
          .where(eq(emailCampaigns.id, c.id));
        continue;
      }

      const emails = recipients.map((r) => r.email.toLowerCase().trim()).filter(Boolean);

      // 3) global unsub blocklist
      const unsubRows = await db
        .select({ email: emailUnsubscribes.email })
        .from(emailUnsubscribes)
        .where(inArray(emailUnsubscribes.email, emails));

      const unsubSet = new Set(unsubRows.map((r) => r.email.toLowerCase().trim()));

      // 4) send each queued recipient
      const templateHasFooterHtml = c.htmlBody.includes("{{footer_html}}");
      const templateHasFooterText = (c.textBody ?? "").includes("{{footer_text}}");

      for (const r of recipients) {
        const to = r.email.toLowerCase().trim();
        if (!to) continue;

        totalProcessed++;

        // skip unsubscribed
        if (unsubSet.has(to)) {
          await db
            .update(emailRecipients)
            .set({
              status: "unsubscribed",
              error: "Skipped (unsubscribed)",
              updatedAt: new Date(),
            })
            .where(eq(emailRecipients.id, r.id));
          continue;
        }

        const { pageUrl, oneClickUrl } = buildUnsubUrls(r.unsubToken);

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

        const subject = renderTemplate(c.subject, vars);
        let htmlBody = renderTemplate(c.htmlBody, vars);
        let textBody = renderTemplate(c.textBody ?? "", vars);

        if (!templateHasFooterHtml) htmlBody = `${htmlBody}\n\n${footerHtml}`;
        if (!templateHasFooterText) textBody = `${textBody}\n\n${footerText}`;

        if (hasUnrenderedTokens(subject) || hasUnrenderedTokens(htmlBody) || hasUnrenderedTokens(textBody)) {
          totalFailed++;
          await db
            .update(emailRecipients)
            .set({
              status: "failed",
              error: "Template contains unknown {{tokens}}.",
              updatedAt: new Date(),
            })
            .where(eq(emailRecipients.id, r.id));
          continue;
        }

        try {
          await sendEmail({
            to,
            subject,
            htmlBody,
            textBody,
            replyTo: "support@swtaxservice.com",
            headers: {
              "List-Unsubscribe": `<${oneClickUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });

          totalSent++;

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
          totalFailed++;
          await db
            .update(emailRecipients)
            .set({
              status: "failed",
              error: String(err?.message ?? err),
              updatedAt: new Date(),
            })
            .where(eq(emailRecipients.id, r.id));
        }
      }
    }

    return NextResponse.json({
      ok: true,
      processed: totalProcessed,
      sent: totalSent,
      failed: totalFailed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 401 }
    );
  }
}
