// app/(admin)/admin/(protected)/email/campaigns/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ALL_TEMPLATES } from "../templates/_templates";
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";
import { compileMjmlToHtmlIfNeeded } from "@/lib/helpers/email-compile.server";
import { fillKnownDefaultsKeepUnknown, now } from "@/lib/helpers/email-utils";

import {
  CreateCampaignSchema,
  UpdateCampaignSchema,
  SetCampaignStatusSchema,
  DuplicateCampaignSchema,
  DeleteCampaignSchema,
  ApplyTemplateSchema,
  BuildRecipientsSchema,
  ScheduleCampaignDbSchema,
} from "@/schemas/email/campaign.server";

import { buildRecipientsFromAudience } from "@/lib/server/email-campaign";

/* =========================
   LOCAL HELPERS
   ========================= */

function getTemplate(templateId: string) {
  const t = ALL_TEMPLATES.find((x) => x.id === templateId);
  if (!t) throw new Error("Template not found.");
  return t;
}

async function compileToHtml(source: string) {
  // supports either sync or async helper
  return await Promise.resolve(compileMjmlToHtmlIfNeeded(source));
}

async function requireQueuedRecipients(campaignId: string) {
  const [row] = await db
    .select({
      queued: sql<number>`sum(case when ${emailRecipients.status} = 'queued' then 1 else 0 end)::int`,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, campaignId));

  const queued = row?.queued ?? 0;
  if (queued <= 0) {
    throw new Error(
      "No queued recipients for this campaign. Build recipients first."
    );
  }
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

  const htmlCompiled = await compileToHtml(htmlBody);

  const [row] = await db
    .insert(emailCampaigns)
    .values({
      name,
      subject,
      htmlBody: htmlCompiled,
      textBody: (textBody ?? "").trim().length ? textBody : null,
      segment: (segment ?? "waitlist_pending") as any,
      status: "draft" as any,
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

  if (htmlBody !== undefined) {
    values.htmlBody = await compileToHtml(htmlBody);
  }

  if (textBody !== undefined) {
    values.textBody = textBody.trim().length ? textBody : null;
  }

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
      segment: ((existing as any).segment ?? "waitlist_pending") as any,
      status: "draft" as any,
      createdAt: now(),
      updatedAt: now(),
      scheduledAt: null,
      schedulerName: null,
      sentAt: null,

      // carry optional fields if you have them
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

  // cleanup recipients first (avoid FK/orphans)
  await db
    .delete(emailRecipients)
    .where(eq(emailRecipients.campaignId, campaignId));
  await db.delete(emailCampaigns).where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/campaigns");
  redirect("/admin/email/campaigns");
}

/**
 * Apply a template to an existing campaign (fills subject/html/text).
 *
 * ✅ MJML allowed (compiled to HTML before saving)
 * ✅ Only fills known defaults (company_name, website, etc.)
 * ✅ Leaves unknown tokens like {{unsubscribe_link}} intact for sending time
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
  const filledSource = fillKnownDefaultsKeepUnknown(
    String(htmlSource),
    knownDefaults
  );

  const compiledHtml = await compileToHtml(filledSource);
  const textBody = fillKnownDefaultsKeepUnknown(textTpl, knownDefaults);

  await db
    .update(emailCampaigns)
    .set({
      subject,
      htmlBody: compiledHtml,
      textBody: textBody.trim().length ? textBody : null,
      updatedAt: now(),
    } as any)
    .where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${campaignId}`);
  redirect(`/admin/email/campaigns/${campaignId}`);
}

/* =========================
   RECIPIENTS (QUEUE)
   ========================= */

export async function buildRecipientsForCampaign(campaignId: string, limit = 5000) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId is required.");

  const [c] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);

  if (!c) throw new Error("Campaign not found.");

  const status = String((c as any).status ?? "draft");

  // Prevent race conditions / accidental resends
  if (status === "sent") {
    return {
      ok: true,
      message: "Campaign already sent; recipients not rebuilt.",
      total: 0,
      queued: 0,
      unsubscribed: 0,
    };
  }
  if (status === "sending") {
    throw new Error("Campaign is currently sending. Try again after it finishes.");
  }

  const out = await buildRecipientsFromAudience({
    campaignId: id,
    segment: String((c as any).segment ?? "waitlist_pending"),
    listId: ((c as any).listId ?? null) as any,
    apptSegment: ((c as any).apptSegment ?? null) as any,
    manualRecipientsRaw: ((c as any).manualRecipientsRaw ?? null) as any,

    waitlistLimit: limit,
    listLimit: limit,
    apptLimit: limit,
    manualLimit: limit,
  });

  revalidatePath("/admin/email");
  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);

  return { ok: true, message: "Recipients queued.", ...out };
}

export async function buildRecipientsForCampaignAction(formData: FormData) {
  const parsed = BuildRecipientsSchema.safeParse({
    campaignId: formData.get("campaignId"),
    limit: formData.get("limit"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await buildRecipientsForCampaign(parsed.data.campaignId, parsed.data.limit);
  redirect(`/admin/email/campaigns/${parsed.data.campaignId}`);
}

/* =========================
   DB SCHEDULING (no AWS)
   ========================= */

export async function scheduleCampaignDb(campaignId: string, scheduledAt: Date) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId is required.");
  if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
    throw new Error("scheduledAt must be a valid Date.");
  }

  // Safety: must be at least 1 minute in the future
  if (scheduledAt.getTime() < Date.now() + 60_000) {
    throw new Error("Send time must be at least 1 minute in the future.");
  }

  const [c] = await db
    .select({ status: emailCampaigns.status })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);

  const status = String((c as any)?.status ?? "draft");
  if (status === "sent") throw new Error("Campaign already sent.");
  if (status === "sending") throw new Error("Campaign is currently sending.");

  // Require queued recipients before scheduling
  await requireQueuedRecipients(id);

  await db
    .update(emailCampaigns)
    .set({
      status: "scheduled" as any,
      scheduledAt,
      schedulerName: null,
      updatedAt: now(),
    } as any)
    .where(eq(emailCampaigns.id, id));

  revalidatePath("/admin/email");
  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${id}`);

  return { ok: true, message: "Campaign scheduled (DB)." };
}

export async function scheduleCampaignDbAction(formData: FormData) {
  // Accept either field name to avoid UI mismatch bugs:
  const scheduledAtIso =
    (formData.get("scheduledAtIso") as any) ?? (formData.get("sendAt") as any);

  const parsed = ScheduleCampaignDbSchema.safeParse({
    campaignId: formData.get("campaignId"),
    scheduledAtIso,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const dt = new Date(parsed.data.scheduledAtIso);
  if (Number.isNaN(dt.getTime())) throw new Error("Invalid scheduledAt datetime.");

  await scheduleCampaignDb(parsed.data.campaignId, dt);
  redirect(`/admin/email/campaigns/${parsed.data.campaignId}`);
}
