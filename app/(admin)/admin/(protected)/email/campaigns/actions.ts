// app/(admin)/admin/(protected)/email/campaigns/actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import {
  emailCampaigns,
  emailRecipients,
  emailCampaignSegment,
  emailCampaignStatus,

  // recipient sources
  waitlist,
  emailSubscribers,
  appointmentRequests,
  appointments,
  users,
} from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ALL_TEMPLATES } from "../templates/_templates";
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";

/* =========================
   TYPES / SCHEMAS
   ========================= */

// ✅ derive allowed values from your Drizzle enums (no string widening)
const SegmentSchema = z.enum(emailCampaignSegment.enumValues);
type CampaignSegment = z.infer<typeof SegmentSchema>;

const StatusSchema = z.enum(emailCampaignStatus.enumValues);
type CampaignStatus = z.infer<typeof StatusSchema>;

const CreateCampaignSchema = z.object({
  name: z.string().trim().min(2, "Campaign name is required."),
  subject: z.string().trim().min(2, "Subject is required."),
  htmlBody: z.string().trim().min(5, "HTML body is required."),
  textBody: z.string().trim().optional(),
  segment: SegmentSchema.optional(),
});

const UpdateCampaignSchema = z.object({
  id: z.string().trim().min(1, "Campaign id is required."),
  name: z.string().trim().min(2).optional(),
  subject: z.string().trim().min(2).optional(),
  htmlBody: z.string().trim().min(5).optional(),
  textBody: z.string().trim().optional(),
  segment: SegmentSchema.optional(),
});

const SetCampaignStatusSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
  status: StatusSchema,
});

const DuplicateCampaignSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
});

const DeleteCampaignSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
});

// Optional: apply template to an existing campaign
const ApplyTemplateSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
  templateId: z.string().trim().min(1, "Template id is required."),
  waitlist_link: z.string().trim().optional(),
});

// ✅ Build recipients
const BuildRecipientsSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
  limit: z.coerce.number().int().min(1).max(50000).default(5000),
});

// ✅ DB scheduling (cheapest)
const ScheduleCampaignDbSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
  // ISO string from <input type="datetime-local"> conversion, etc.
  scheduledAtIso: z.string().trim().min(1, "scheduledAt is required."),
});

/* =========================
   HELPERS
   ========================= */

function getTemplate(templateId: string) {
  const t = ALL_TEMPLATES.find((x) => x.id === templateId);
  if (!t) throw new Error("Template not found.");
  return t;
}

/**
 * Replace ONLY keys we know (defaults) and leave all other {{tokens}} untouched.
 * - supports {{key}} and {{{key}}}
 */
function fillKnownDefaultsKeepUnknown(
  input: string,
  vars: Record<string, string>
) {
  let out = String(input ?? "");
  for (const [k, v] of Object.entries(vars)) {
    const safeV = String(v ?? "");
    const re = new RegExp(`{{{?\\s*${k}\\s*}?}}`, "g");
    out = out.replace(re, safeV);
  }
  return out;
}

function now() {
  return new Date();
}

function normalizeEmail(email: string) {
  return String(email ?? "").toLowerCase().trim();
}

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

type Recipient = { email: string };

function dedupeEmails(list: Recipient[]) {
  const s = new Set<string>();
  const out: Recipient[] = [];
  for (const r of list) {
    const e = normalizeEmail(r.email);
    if (!e) continue;
    if (s.has(e)) continue;
    s.add(e);
    out.push({ email: e });
  }
  return out;
}

function parseManualRecipients(input?: string, limit = 5000): Recipient[] {
  const raw = (input ?? "").trim();
  if (!raw) return [];

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const emails = raw
    .split(/[\n,;]+/g)
    .map((x) => normalizeEmail(x))
    .filter((e) => e && emailRe.test(e));

  const unique = [...new Set(emails)];
  return unique.slice(0, limit).map((email) => ({ email }));
}

function parseTags(input?: string): string[] {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return [];
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return [...new Set(tags)];
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* =========================
   RECIPIENT LOADERS
   ========================= */

async function loadWaitlistEmails(
  segment: "waitlist_pending" | "waitlist_approved" | "waitlist_all",
  limit: number
): Promise<Recipient[]> {
  if (segment === "waitlist_all") {
    const rows = await db
      .select({ email: waitlist.email })
      .from(waitlist)
      .limit(limit);
    return rows.map((r) => ({ email: normalizeEmail(r.email) })).filter((r) => r.email);
  }

  if (segment === "waitlist_pending") {
    const rows = await db
      .select({ email: waitlist.email })
      .from(waitlist)
      .where(eq(waitlist.status, "pending"))
      .limit(limit);
    return rows.map((r) => ({ email: normalizeEmail(r.email) })).filter((r) => r.email);
  }

  const rows = await db
    .select({ email: waitlist.email })
    .from(waitlist)
    .where(eq(waitlist.status, "approved"))
    .limit(limit);
  return rows.map((r) => ({ email: normalizeEmail(r.email) })).filter((r) => r.email);
}

/**
 * Email list recipients (email_subscribers)
 * - status=subscribed
 * - if tags empty => all subscribed
 * - if tags provided => match ANY tag
 */
async function loadEmailListEmailsByTags(tagsCsv: string | null | undefined, limit: number) {
  const tags = parseTags(tagsCsv ?? "");
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
    .select({ email: emailSubscribers.email })
    .from(emailSubscribers)
    .where(whereClause)
    .limit(limit);

  return rows.map((r) => ({ email: normalizeEmail(r.email) })).filter((r) => r.email);
}

type ApptSegment = "upcoming" | "today" | "past" | "cancelled" | "all";

async function loadAppointmentEmails(apptSegment: ApptSegment, limit: number) {
  const n = new Date();

  const startOfToday = new Date(n);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const CANCELLED_STATUS = "cancelled";

  // ---- appointment_requests (leads) ----
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
      sql`${appointmentRequests.scheduledAt} >= ${n}`,
      sql`${appointmentRequests.status} != ${CANCELLED_STATUS}`
    )!;
  } else if (apptSegment === "past") {
    reqWhere = and(
      sql`${appointmentRequests.scheduledAt} < ${n}`,
      sql`${appointmentRequests.status} != ${CANCELLED_STATUS}`
    )!;
  }

  const reqRows = await db
    .select({ email: appointmentRequests.email })
    .from(appointmentRequests)
    .where(reqWhere)
    .limit(limit);

  // ---- appointments (booked users) ----
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
      sql`${appointments.scheduledAt} >= ${n}`,
      sql`${appointments.status} != ${CANCELLED_STATUS}`
    )!;
  } else if (apptSegment === "past") {
    apptWhere = and(
      sql`${appointments.scheduledAt} < ${n}`,
      sql`${appointments.status} != ${CANCELLED_STATUS}`
    )!;
  }

  const apptRows = await db
    .select({ email: users.email })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.userId))
    .where(apptWhere)
    .limit(limit);

  const combined = [
    ...reqRows.map((r) => ({ email: normalizeEmail(r.email) })),
    ...apptRows.map((r) => ({ email: normalizeEmail(r.email) })),
  ].filter((r) => r.email);

  return dedupeEmails(combined).slice(0, limit);
}

/* =========================
   ACTIONS (CRUD)
   ========================= */

export async function createCampaign(formData: FormData): Promise<void> {
  const parsed = CreateCampaignSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    htmlBody: formData.get("htmlBody"),
    textBody: formData.get("textBody"),
    segment: formData.get("segment"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { name, subject, htmlBody, textBody, segment } = parsed.data;

  const [row] = await db
    .insert(emailCampaigns)
    .values({
      name,
      subject,
      htmlBody,
      textBody: (textBody ?? "").trim().length ? textBody : null,
      segment: (segment ?? "waitlist_pending") as CampaignSegment,
      status: "draft" as CampaignStatus,
      createdAt: now(),
      updatedAt: now(),
      scheduledAt: null,
      schedulerName: null,
      sentAt: null,
    } as any)
    .returning({ id: emailCampaigns.id });

  revalidatePath("/admin/email/campaigns");
  redirect(`/admin/email/campaigns/${row.id}`);
}

export async function updateCampaign(formData: FormData): Promise<void> {
  const parsed = UpdateCampaignSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    subject: formData.get("subject"),
    htmlBody: formData.get("htmlBody"),
    textBody: formData.get("textBody"),
    segment: formData.get("segment"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { id, name, subject, htmlBody, textBody, segment } = parsed.data;

  const values: any = { updatedAt: now() };

  if (name !== undefined) values.name = name;
  if (subject !== undefined) values.subject = subject;
  if (htmlBody !== undefined) values.htmlBody = htmlBody;
  if (textBody !== undefined) values.textBody = textBody.trim().length ? textBody : null;
  if (segment !== undefined) values.segment = segment;

  await db.update(emailCampaigns).set(values).where(eq(emailCampaigns.id, id));

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}

export async function setCampaignStatus(formData: FormData): Promise<void> {
  const parsed = SetCampaignStatusSchema.safeParse({
    campaignId: formData.get("campaignId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { campaignId, status } = parsed.data;

  const patch: any = {
    status,
    updatedAt: now(),
  };

  if (status === "draft") {
    patch.scheduledAt = null;
    patch.schedulerName = null;
    patch.sentAt = null;
  }

  if (status === "sending") {
    patch.sentAt = null;
  }

  if (status === "sent") {
    patch.sentAt = now();
    patch.scheduledAt = null;
    patch.schedulerName = null;
  }

  await db
    .update(emailCampaigns)
    .set(patch)
    .where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${campaignId}`);
  redirect(`/admin/email/campaigns/${campaignId}`);
}

export async function duplicateCampaign(formData: FormData): Promise<void> {
  const parsed = DuplicateCampaignSchema.safeParse({
    campaignId: formData.get("campaignId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { campaignId } = parsed.data;

  const [existing] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  if (!existing) throw new Error("Campaign not found.");

  const [row] = await db
    .insert(emailCampaigns)
    .values({
      name: `${String((existing as any).name ?? "Campaign")} (Copy)`,
      subject: String((existing as any).subject ?? ""),
      htmlBody: String((existing as any).htmlBody ?? ""),
      textBody: (existing as any).textBody ?? null,
      segment: ((existing as any).segment ?? "waitlist_pending") as CampaignSegment,
      status: "draft" as CampaignStatus,
      createdAt: now(), // ✅ new time
      updatedAt: now(),
      scheduledAt: null,
      schedulerName: null,
      sentAt: null,
      // carry extra fields if you have them (safe even if missing in DB due to "as any" above)
      apptSegment: (existing as any).apptSegment ?? null,
      manualRecipientsRaw: (existing as any).manualRecipientsRaw ?? null,
      listId: (existing as any).listId ?? null,
    } as any)
    .returning({ id: emailCampaigns.id });

  revalidatePath("/admin/email/campaigns");
  redirect(`/admin/email/campaigns/${row.id}`);
}

export async function deleteCampaign(formData: FormData): Promise<void> {
  const parsed = DeleteCampaignSchema.safeParse({
    campaignId: formData.get("campaignId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { campaignId } = parsed.data;

  // ✅ cleanup recipients first (avoid FK/orphans)
  await db.delete(emailRecipients).where(eq(emailRecipients.campaignId, campaignId));
  await db.delete(emailCampaigns).where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/campaigns");
  redirect("/admin/email/campaigns");
}

/**
 * Apply a template to an existing campaign (fills subject/html/text).
 *
 * ✅ Supports MJML OR HTML templates
 * ✅ Only fills known defaults (company_name, website, etc.)
 * ✅ Leaves unknown tokens like {{unsubscribe_link}} intact for the runner
 */
export async function applyTemplateToCampaign(formData: FormData): Promise<void> {
  const parsed = ApplyTemplateSchema.safeParse({
    campaignId: formData.get("campaignId"),
    templateId: formData.get("templateId"),
    waitlist_link: formData.get("waitlist_link"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { campaignId, templateId, waitlist_link } = parsed.data;
  const t = getTemplate(templateId);

  const htmlSource = (t as any).mjml ?? (t as any).html;
  if (!htmlSource) {
    throw new Error(
      `Template "${templateId}" is missing required "mjml" or "html" content.`
    );
  }

  const knownDefaults: Record<string, string> = {
    ...(EMAIL_DEFAULTS as any),
    ...(waitlist_link ? { waitlist_link } : {}),
  };

  const subjectTpl = String((t as any).subject ?? "");
  const textTpl = String((t as any).text ?? "");

  const subject = fillKnownDefaultsKeepUnknown(subjectTpl, knownDefaults);
  const htmlBody = fillKnownDefaultsKeepUnknown(String(htmlSource), knownDefaults);
  const textBody = fillKnownDefaultsKeepUnknown(textTpl, knownDefaults);

  await db
    .update(emailCampaigns)
    .set({
      subject,
      htmlBody,
      textBody: textBody.trim().length ? textBody : null,
      updatedAt: now(),
    } as any)
    .where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${campaignId}`);
  redirect(`/admin/email/campaigns/${campaignId}`);
}

/* =========================
   ✅ MISSING ACTION #1:
   Build recipients (queue)
   ========================= */

/**
 * Cheapest plan:
 * - Build/queue recipients into email_recipients(status='queued')
 * - Runner sends later (every 5m)
 *
 * Sources by segment:
 * - waitlist_* => waitlist table
 * - email_list => email_subscribers (optional tag filter from campaign.manualRecipientsRaw)
 * - appointments => appointment_requests + appointments/users (apptSegment from campaign.apptSegment)
 * - manual => parse emails from campaign.manualRecipientsRaw
 */
export async function buildRecipientsForCampaign(campaignId: string, limit = 5000) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId is required.");

  // Load campaign
  const [c] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);

  if (!c) throw new Error("Campaign not found.");

  const segment = String((c as any).segment ?? "") as CampaignSegment;

  // Don’t build for sent campaigns (prevents accidental resends)
  if ((c as any).status === "sent") {
    return { ok: true, message: "Campaign already sent; recipients not rebuilt.", inserted: 0, total: 0 };
  }

  let recipients: Recipient[] = [];

  if (
    segment === "waitlist_pending" ||
    segment === "waitlist_approved" ||
    segment === "waitlist_all"
  ) {
    recipients = await loadWaitlistEmails(segment, limit);
  } else if (segment === "email_list") {
    // We store tags CSV in manualRecipientsRaw (same pattern you used earlier)
    const tagsCsv = (c as any).manualRecipientsRaw as string | null | undefined;
    recipients = await loadEmailListEmailsByTags(tagsCsv, limit);
  } else if (segment === "appointments") {
    const apptSegment = ((c as any).apptSegment ?? "all") as ApptSegment;
    recipients = await loadAppointmentEmails(apptSegment, limit);
  } else if (segment === "manual") {
    const raw = (c as any).manualRecipientsRaw as string | null | undefined;
    recipients = parseManualRecipients(raw ?? "", limit);
  } else {
    // unknown segment
    recipients = [];
  }

  recipients = dedupeEmails(recipients).slice(0, limit);

  if (!recipients.length) {
    return { ok: true, message: "No recipients found for this segment.", inserted: 0, total: 0 };
  }

  // Insert in chunks to avoid giant SQL
  const chunks = chunk(recipients, 1000);

  let inserted = 0;

  for (const group of chunks) {
    const values = group.map((r) => ({
      campaignId: id,
      email: r.email,
      unsubToken: makeToken(),
      status: "queued",
      updatedAt: now(),
    }));

    // Drizzle doesn't always return rowCount with onConflictDoNothing;
    // but it’s still safe + idempotent.
    const res = await db
      .insert(emailRecipients)
      .values(values as any)
      .onConflictDoNothing()
      .returning({ id: emailRecipients.id });

    inserted += res.length;
  }

  // If campaign was draft and we just built recipients, keep it draft.
  // You can schedule or start sending separately.
  revalidatePath("/admin/email");
  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);

  return { ok: true, message: "Recipients queued.", inserted, total: recipients.length };
}

// Optional FormData wrapper (handy for <form action=...>)
export async function buildRecipientsForCampaignAction(formData: FormData) {
  const parsed = BuildRecipientsSchema.safeParse({
    campaignId: formData.get("campaignId"),
    limit: formData.get("limit"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const out = await buildRecipientsForCampaign(parsed.data.campaignId, parsed.data.limit);

  // stay on campaign page
  redirect(`/admin/email/campaigns/${parsed.data.campaignId}`);
}

/* =========================
   ✅ MISSING ACTION #2:
   DB scheduling (no AWS)
   ========================= */

/**
 * Cheapest scheduling:
 * - Set status='scheduled'
 * - Set scheduledAt datetime
 * Runner (every 5m) promotes scheduled->sending when due.
 */
export async function scheduleCampaignDb(campaignId: string, scheduledAt: Date) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId is required.");
  if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
    throw new Error("scheduledAt must be a valid Date.");
  }

  await db
    .update(emailCampaigns)
    .set({
      status: "scheduled" as CampaignStatus,
      scheduledAt,
      // no AWS scheduler name in cheapest plan
      schedulerName: null,
      updatedAt: now(),
    } as any)
    .where(eq(emailCampaigns.id, id));

  revalidatePath("/admin/email");
  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);

  return { ok: true, message: "Campaign scheduled (DB)." };
}

// Optional FormData wrapper
export async function scheduleCampaignDbAction(formData: FormData) {
  const parsed = ScheduleCampaignDbSchema.safeParse({
    campaignId: formData.get("campaignId"),
    scheduledAtIso: formData.get("scheduledAtIso"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const dt = new Date(parsed.data.scheduledAtIso);
  if (Number.isNaN(dt.getTime())) throw new Error("Invalid scheduledAt datetime.");

  await scheduleCampaignDb(parsed.data.campaignId, dt);

  redirect(`/admin/email/campaigns/${parsed.data.campaignId}`);
}
