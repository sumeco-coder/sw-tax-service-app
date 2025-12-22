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
  emailSubscribers,
  appointments,
  appointmentRequests,
  users,
} from "@/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

/**
 * ✅ This file is now "QUEUE ONLY"
 * - Creates the campaign row
 * - Builds the recipient list (waitlist/email list/appointments/manual)
 * - Inserts recipients into email_recipients as:
 *    - queued (sendable)
 *    - unsubscribed (skipped)
 *
 * ❌ It does NOT send any emails.
 * ✅ Sending is handled ONLY by your Amplify runner (emailCampaignRunner) on its timer.
 */

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

  // email list tag filter (comma separated)
  listTags: z.string().optional().transform((v) => (v ?? "").trim()),

  // appointments
  apptSegment: z
    .enum(["upcoming", "today", "past", "cancelled", "all"])
    .optional(),

  // manual
  manualEmails: z.string().optional(),

  limit: z.coerce.number().int().min(1).max(5000).default(200),

  subject: z.string().trim().min(2, "Subject is required."),
  htmlBody: z.string().trim().min(5, "HTML body is required."),

  // allow blank textBody
  textBody: z.string().optional().transform((v) => (v ?? "").trim()),
});

// =========================
// Utils
// =========================
function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function normalizeEmail(email: string) {
  return (email ?? "").toLowerCase().trim();
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
async function loadEmailListRecipientsByTags(
  listTags: string | undefined,
  limit: number
): Promise<Recipient[]> {
  const tags = parseTags(listTags);
  const baseWhere = eq(emailSubscribers.status, "subscribed");

  let whereClause: any = baseWhere;

  if (tags.length) {
    const tagOr = tags
      .map(
        (t) =>
          sql`(',' || lower(coalesce(${emailSubscribers.tags}, '')) || ',') like ${`%,${t},%`}`
      )
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

async function loadAppointmentRecipients(
  apptSegment: ApptSegment,
  limit: number
): Promise<Recipient[]> {
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
    ...reqRows.map((r) => ({
      email: normalizeEmail(r.email),
      fullName: r.fullName,
    })),
    ...apptRows.map((r) => ({
      email: normalizeEmail(r.email),
      fullName: r.fullName,
    })),
  ].filter((r) => r.email);

  return dedupeRecipients(combined).slice(0, limit);
}

// =========================
// Action (QUEUE ONLY)
// =========================
export async function createAndSendCampaignAction(
  formData: FormData
): Promise<void> {
  const parsed = SendCampaignSchema.safeParse({
    name: fdOptionalString(formData, "name"),
    segment: fdString(formData, "segment"),

    listTags: fdOptionalString(formData, "listTags"),
    apptSegment: fdOptionalString(formData, "apptSegment") as
      | ApptSegment
      | undefined,
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

  // segment validation
  if (segment === "appointments" && !apptSegment) {
    throw new Error("apptSegment: Please select an appointments segment.");
  }
  if (segment === "manual") {
    const manualParsed = parseManualRecipients(manualEmails, limit);
    if (!manualParsed.length)
      throw new Error("manualEmails: Paste at least 1 valid email.");
  }

  // 1) Create campaign (set to "sending" so runner picks it up)
  const [campaign] = await db
    .insert(emailCampaigns)
    .values({
      name: name?.trim() || "Campaign",
      segment: segment as any,

      // listId not used anymore
      listId: null,

      // store appt segment if used
      apptSegment: segment === "appointments" ? (apptSegment as any) : null,

      // store tags/manual recipients for audit (optional)
      manualRecipientsRaw:
        segment === "email_list"
          ? (listTags ?? "").trim()
          : segment === "manual"
          ? (manualEmails ?? "").trim()
          : null,

      status: "sending", // ✅ runner will send (every 5m)
      subject: subjectRaw,
      htmlBody: htmlBodyRaw,
      textBody: (textBodyRaw ?? "").trim().length ? textBodyRaw : null,
      updatedAt: new Date(),
    } as any)
    .returning({ id: emailCampaigns.id });

  // 2) Build recipients
  let recipients: Recipient[] = [];

  if (segment === "manual") {
    recipients = parseManualRecipients(manualEmails, limit);
  } else if (segment === "email_list") {
    recipients = await loadEmailListRecipientsByTags(listTags, limit);
  } else if (segment === "appointments") {
    recipients = await loadAppointmentRecipients(apptSegment as ApptSegment, limit);
  } else {
    recipients = await loadWaitlistRecipients(segment as any, limit);
  }

  recipients = dedupeRecipients(recipients);

  // If none, finalize campaign (nothing to do)
  if (!recipients.length) {
    await db
      .update(emailCampaigns)
      .set({
        status: "sent" as any,
        sentAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(emailCampaigns.id, campaign.id));

    revalidatePath("/admin/email");
    revalidatePath("/admin/email/campaigns");
    return;
  }

  // 3) Unsubscribes (global blocklist)
  const emails = recipients.map((r) => normalizeEmail(r.email)).filter(Boolean);

  const unsubRows = emails.length
    ? await db
        .select({ email: emailUnsubscribes.email })
        .from(emailUnsubscribes)
        .where(inArray(emailUnsubscribes.email, emails))
    : [];

  const unsubSet = new Set(unsubRows.map((r) => normalizeEmail(r.email)));

  // 4) Insert email_recipients as queued/unsubscribed (NO SENDING HERE)
  const now = new Date();
  const rowsToInsert = recipients
    .map((r) => {
      const email = normalizeEmail(r.email);
      if (!email) return null;

      const isUnsub = unsubSet.has(email);

      return {
        campaignId: campaign.id,
        email,
        unsubToken: makeToken(),
        status: (isUnsub ? "unsubscribed" : "queued") as any,
        error: isUnsub ? "Skipped (unsubscribed)" : null,
        updatedAt: now,
      };
    })
    .filter(Boolean) as any[];

  // chunk insert to avoid huge SQL payloads
  const CHUNK = 1000;
  for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
    const chunk = rowsToInsert.slice(i, i + CHUNK);
    await db.insert(emailRecipients).values(chunk).onConflictDoNothing();
  }

  // 5) Revalidate admin views
  revalidatePath("/admin/email");
  revalidatePath("/admin/email/campaigns");
  revalidatePath("/admin/email/logs");
}
