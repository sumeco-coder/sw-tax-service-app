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

  // ✅ use subscribers table for "Email List"
  emailSubscribers,

  // ✅ appointments + requests
  appointments,
  appointmentRequests,

  // ✅ join for appointments -> users
  users,
} from "@/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

import { sendEmail } from "@/lib/email/sendEmail";
import { buildEmailFooterHTML, buildEmailFooterText } from "@/lib/email/footer";
import { z } from "zod";

import {
  renderHandlebars,
  isMjml,
  compileMjmlToHtml,
  safeHtml,
} from "@/lib/email/templateEngine";
import { EMAIL_PARTIALS } from "@/lib/email/templatePartials";
import { htmlToText } from "html-to-text";

// =========================
// Types
// =========================
type Segment =
  | "waitlist_pending"
  | "waitlist_approved"
  | "waitlist_all"
  | "email_list"
  | "appointments"
  | "manual";

// ✅ standardized spelling: cancelled (double L)
type ApptSegment = "upcoming" | "today" | "past" | "cancelled" | "all";

type Recipient = { email: string; fullName?: string | null };

// =========================
// FormData helpers
// =========================
function fdString(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function fdOptionalString(formData: FormData, key: string) {
  const v = formData.get(key);
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

// =========================
// Validation
// =========================
const SendCampaignSchema = z.object({
  name: z
    .string()
    .optional()
    .transform((v) => {
      const s = (v ?? "").trim();
      return s.length ? s : undefined;
    }),

  segment: z
    .enum([
      "waitlist_pending",
      "waitlist_approved",
      "waitlist_all",
      "email_list",
      "appointments",
      "manual",
    ])
    .default("waitlist_pending"),

  // ✅ list tag filter (comma separated)
  listTags: z.string().optional().transform((v) => (v ?? "").trim()),

  // appointments
  apptSegment: z.enum(["upcoming", "today", "past", "cancelled", "all"]).optional(),

  // manual
  manualEmails: z.string().optional(),

  limit: z.coerce.number().int().min(1).max(5000).default(200),

  subject: z.string().trim().min(2, "Subject is required."),
  htmlBody: z.string().trim().min(5, "HTML body is required."),

  // ✅ allow blank textBody; generate from HTML
  textBody: z.string().optional().transform((v) => (v ?? "").trim()),
});

// =========================
// URL helpers
// =========================
function getAppUrl() {
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

// =========================
// Recipient helpers
// =========================
function normalizeEmail(email: string) {
  return (email ?? "").toLowerCase().trim();
}

function firstNameFrom(fullName?: string | null) {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

function dedupeRecipients(list: Recipient[]) {
  const map = new Map<string, Recipient>();
  for (const r of list) {
    const e = normalizeEmail(r.email);
    if (!e) continue;
    if (!map.has(e)) map.set(e, { email: e, fullName: r.fullName ?? null });
  }
  return [...map.values()];
}

function parseManualRecipients(input?: string, limit = 200): Recipient[] {
  const s = (input ?? "").trim();
  if (!s) return [];

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const emails = s
    .split(/[\n,;]+/g)
    .map((x) => normalizeEmail(x))
    .filter((e) => e && emailRe.test(e));

  const unique = [...new Set(emails)];
  return unique.slice(0, limit).map((email) => ({ email }));
}

function parseTags(input?: string): string[] {
  const raw = (input ?? "").trim();
  if (!raw) return [];
  const tags = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

// =========================
// Loaders
// =========================
async function loadWaitlistRecipients(
  segment: "waitlist_pending" | "waitlist_approved" | "waitlist_all",
  limit: number
): Promise<Recipient[]> {
  if (segment === "waitlist_all") {
    const rows = await db
      .select({ email: waitlist.email, fullName: waitlist.fullName })
      .from(waitlist)
      .limit(limit);

    return rows
      .map((r) => ({ email: normalizeEmail(r.email), fullName: r.fullName }))
      .filter((r) => r.email);
  }

  if (segment === "waitlist_pending") {
    const rows = await db
      .select({ email: waitlist.email, fullName: waitlist.fullName })
      .from(waitlist)
      .where(eq(waitlist.status, "pending"))
      .limit(limit);

    return rows
      .map((r) => ({ email: normalizeEmail(r.email), fullName: r.fullName }))
      .filter((r) => r.email);
  }

  const rows = await db
    .select({ email: waitlist.email, fullName: waitlist.fullName })
    .from(waitlist)
    .where(eq(waitlist.status, "approved"))
    .limit(limit);

  return rows
    .map((r) => ({ email: normalizeEmail(r.email), fullName: r.fullName }))
    .filter((r) => r.email);
}

/**
 * ✅ Email List = email_subscribers (status=subscribed)
 * Tag match:
 * - if listTags is empty => ALL subscribed
 * - if listTags provided => match ANY tag (OR)
 *
 * Matching logic uses: (',' || lower(tags) || ',') LIKE '%,tag,%'
 */
async function loadEmailListRecipientsByTags(listTags: string | undefined, limit: number): Promise<Recipient[]> {
  const tags = parseTags(listTags);

  const baseWhere = eq(emailSubscribers.status, "subscribed");

  let whereClause: any = baseWhere;

  if (tags.length) {
    const tagOr = tags
      .map((t) => sql`(',' || lower(coalesce(${emailSubscribers.tags}, '')) || ',') like ${`%,${t},%`}`)
      .reduce((acc, cur) => (acc ? sql`${acc} OR ${cur}` : cur), null as any);

    whereClause = and(baseWhere, tagOr)!;
  }

  const rows = await db
    .select({
      email: emailSubscribers.email,
      fullName: emailSubscribers.fullName,
    })
    .from(emailSubscribers)
    .where(whereClause)
    .limit(limit);

  return rows
    .map((r) => ({ email: normalizeEmail(r.email), fullName: r.fullName }))
    .filter((r) => r.email);
}

async function loadAppointmentRecipients(apptSegment: ApptSegment, limit: number): Promise<Recipient[]> {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const CANCELLED_STATUS = "cancelled";

  // -------- appointment_requests (leads) --------
  let reqWhere = sql`true`;

  if (apptSegment === "cancelled") {
    reqWhere = sql`${appointmentRequests.status} = ${CANCELLED_STATUS}`;
  } else if (apptSegment === "today") {
    reqWhere = and(
      sql`${appointmentRequests.scheduledAt} >= ${startOfToday}`,
      sql`${appointmentRequests.scheduledAt} < ${endOfToday}`,
      sql`${appointmentRequests.status} != ${CANCELLED_STATUS}`
    )!;
  } else if (apptSegment === "upcoming") {
    reqWhere = and(
      sql`${appointmentRequests.scheduledAt} >= ${now}`,
      sql`${appointmentRequests.status} != ${CANCELLED_STATUS}`
    )!;
  } else if (apptSegment === "past") {
    reqWhere = and(
      sql`${appointmentRequests.scheduledAt} < ${now}`,
      sql`${appointmentRequests.status} != ${CANCELLED_STATUS}`
    )!;
  } else {
    reqWhere = sql`true`;
  }

  const reqRows = await db
    .select({
      email: appointmentRequests.email,
      fullName: appointmentRequests.name,
    })
    .from(appointmentRequests)
    .where(reqWhere)
    .limit(limit);

  // -------- appointments (booked users) --------
  let apptWhere = sql`true`;

  if (apptSegment === "cancelled") {
    apptWhere = sql`${appointments.status} = ${CANCELLED_STATUS}`;
  } else if (apptSegment === "today") {
    apptWhere = and(
      sql`${appointments.scheduledAt} >= ${startOfToday}`,
      sql`${appointments.scheduledAt} < ${endOfToday}`,
      sql`${appointments.status} != ${CANCELLED_STATUS}`
    )!;
  } else if (apptSegment === "upcoming") {
    apptWhere = and(
      sql`${appointments.scheduledAt} >= ${now}`,
      sql`${appointments.status} != ${CANCELLED_STATUS}`
    )!;
  } else if (apptSegment === "past") {
    apptWhere = and(
      sql`${appointments.scheduledAt} < ${now}`,
      sql`${appointments.status} != ${CANCELLED_STATUS}`
    )!;
  } else {
    apptWhere = sql`true`;
  }

  const apptRows = await db
    .select({
      email: users.email,
      fullName: users.name,
    })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.userId))
    .where(apptWhere)
    .limit(limit);

  const combined: Recipient[] = [
    ...reqRows.map((r) => ({ email: normalizeEmail(r.email), fullName: r.fullName })),
    ...apptRows.map((r) => ({ email: normalizeEmail(r.email), fullName: r.fullName })),
  ].filter((r) => r.email);

  return dedupeRecipients(combined).slice(0, limit);
}

// =========================
// Action
// =========================
export async function createAndSendCampaignAction(formData: FormData): Promise<void> {
  const parsed = SendCampaignSchema.safeParse({
    name: fdOptionalString(formData, "name"),
    segment: fdString(formData, "segment"),

    listTags: fdOptionalString(formData, "listTags"),
    apptSegment: fdOptionalString(formData, "apptSegment") as ApptSegment | undefined,
    manualEmails: fdOptionalString(formData, "manualEmails"),

    limit: formData.get("limit"),
    subject: formData.get("subject"),
    htmlBody: formData.get("htmlBody"),
    textBody: formData.get("textBody"),
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".") || "field"}: ${i.message}`)
      .join(" | ");
    throw new Error(details || "Invalid input.");
  }

  const {
    name,
    segment,
    listTags,
    apptSegment,
    manualEmails,
    limit,
    subject: subjectRaw,
    htmlBody: htmlBodyRaw,
    textBody: textBodyRaw,
  } = parsed.data;

  // ✅ segment validation
  if (segment === "appointments" && !apptSegment) {
    throw new Error("apptSegment: Please select an appointments segment.");
  }
  if (segment === "manual") {
    const manualParsed = parseManualRecipients(manualEmails, limit);
    if (!manualParsed.length) throw new Error("manualEmails: Paste at least 1 valid email.");
  }

  const [campaign] = await db
    .insert(emailCampaigns)
    .values({
      name: name?.trim() || "Campaign",
      segment,

      // listId not used anymore (keep null)
      listId: null,

      // store appt segment if used
      apptSegment: segment === "appointments" ? (apptSegment as any) : null,

      // store tags for audit (optional)
      manualRecipientsRaw: segment === "email_list" ? (listTags ?? "").trim() : segment === "manual" ? (manualEmails ?? "").trim() : null,

      status: "sending",
      subject: subjectRaw,
      htmlBody: htmlBodyRaw,
      textBody: (textBodyRaw ?? "").trim().length ? textBodyRaw : null,
      updatedAt: new Date(),
    })
    .returning({ id: emailCampaigns.id });

  // 2) recipients
  let recipients: Recipient[] = [];

  if (segment === "manual") {
    recipients = parseManualRecipients(manualEmails, limit);
  } else if (segment === "email_list") {
    recipients = await loadEmailListRecipientsByTags(listTags, limit);
  } else if (segment === "appointments") {
    recipients = await loadAppointmentRecipients(apptSegment as ApptSegment, limit);
  } else {
    recipients = await loadWaitlistRecipients(segment, limit);
  }

  recipients = dedupeRecipients(recipients);

  if (!recipients.length) {
    await db
      .update(emailCampaigns)
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(emailCampaigns.id, campaign.id));

    revalidatePath("/admin/email");
    return;
  }

  const emails = recipients.map((r) => r.email);

  // 3) unsubscribes
  const unsubRows = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, emails));

  const unsubSet = new Set(unsubRows.map((r) => normalizeEmail(r.email)));

  // 4) footer placeholders detection (Handlebars + partial footer support)
  const templateHasFooterHtml =
    htmlBodyRaw.includes("{{footer_html}}") ||
    htmlBodyRaw.includes("{{{footer_html}}}") ||
    htmlBodyRaw.includes("{{> footer}}");

  const templateHasFooterText =
    (textBodyRaw ?? "").includes("{{footer_text}}") ||
    (textBodyRaw ?? "").includes("{{{footer_text}}}") ||
    (textBodyRaw ?? "").includes("{{> footer}}");

  let sentCount = 0;
  let failedCount = 0;

  for (const r of recipients) {
    const normalized = normalizeEmail(r.email);
    if (!normalized) continue;

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

    const [rec] = await db
      .select({
        id: emailRecipients.id,
        status: emailRecipients.status,
        unsubToken: emailRecipients.unsubToken,
      })
      .from(emailRecipients)
      .where(and(eq(emailRecipients.campaignId, campaign.id), eq(emailRecipients.email, normalized)))
      .limit(1);

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

    const vars: Record<string, any> = {
      company_name: "SW Tax Service",
      waitlist_link: "https://www.swtaxservice.com/waitlist",
      support_email: "support@swtaxservice.com",
      website: "https://www.swtaxservice.com",

      first_name: firstNameFrom(r.fullName),
      signature_name: "SW Tax Service Team",

      unsubscribe_link: pageUrl,
      one_click_unsub_url: oneClickUrl,

      footer_html: safeHtml ? safeHtml(footerHtml) : footerHtml,
      footer_text: footerText,
    };

    let renderedSubject = "";
    let renderedHtml = "";
    let renderedText = "";

    // ===== render (Handlebars -> optional MJML -> text) =====
    try {
      renderedSubject = renderHandlebars(subjectRaw, vars, EMAIL_PARTIALS);

      const renderedSource = renderHandlebars(htmlBodyRaw, vars, EMAIL_PARTIALS);
      renderedHtml = isMjml(renderedSource)
        ? await compileMjmlToHtml(renderedSource)
        : renderedSource;

      if ((textBodyRaw ?? "").trim().length) {
        renderedText = renderHandlebars(textBodyRaw ?? "", vars, EMAIL_PARTIALS);
      } else {
        renderedText = htmlToText(renderedHtml, { wordwrap: 90 });
      }

      if (!templateHasFooterHtml) renderedHtml = `${renderedHtml}\n\n${footerHtml}`;
      if (!templateHasFooterText) renderedText = `${renderedText}\n\n${footerText}`;
    } catch (e: any) {
      failedCount++;
      await db
        .update(emailRecipients)
        .set({
          status: "failed",
          error: String(e?.message ?? e),
          updatedAt: new Date(),
        })
        .where(eq(emailRecipients.id, rec.id));
      continue;
    }

    // ✅ save preview fields (so /admin/email/logs/[recipientId] can render them)
    await db
      .update(emailRecipients)
      .set({
        renderedSubject,
        renderedHtml,
        renderedText,
        updatedAt: new Date(),
      })
      .where(eq(emailRecipients.id, rec.id));

    try {
      await sendEmail({
        to: normalized,
        subject: renderedSubject,
        htmlBody: renderedHtml,
        textBody: renderedText,
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
