// app/(admin)/admin/(protected)/email/campaigns/actions.ts
"use server";

import { db } from "@/drizzle/db";
import {
  emailCampaigns,
  emailCampaignSegment,
  emailCampaignStatus,
} from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ALL_TEMPLATES } from "../templates/_templates";
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";
import { renderString, withDefaults } from "@/lib/helper/render-template";
import type { TemplateVars } from "@/types/email";

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
  // optional overrides you can pass from UI
  waitlist_link: z.string().trim().optional(),
});

/* =========================
   HELPERS
   ========================= */

function getTemplate(templateId: string) {
  const t = ALL_TEMPLATES.find((x) => x.id === templateId);
  if (!t) throw new Error("Template not found.");
  return t;
}

function safeDate(v: unknown) {
  return v instanceof Date ? v : new Date();
}

/* =========================
   ACTIONS
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
      textBody: textBody || null,
      segment: (segment ?? "waitlist_pending") as CampaignSegment,
      status: "draft" as CampaignStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
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

  const values: Partial<{
    name: string;
    subject: string;
    htmlBody: string;
    textBody: string | null;
    segment: CampaignSegment;
    updatedAt: Date;
  }> = { updatedAt: new Date() };

  if (name !== undefined) values.name = name;
  if (subject !== undefined) values.subject = subject;
  if (htmlBody !== undefined) values.htmlBody = htmlBody;
  if (textBody !== undefined) values.textBody = textBody || null;
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

  await db
    .update(emailCampaigns)
    .set({ status, updatedAt: new Date() })
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
      name: `${existing.name} (Copy)`,
      subject: existing.subject,
      htmlBody: existing.htmlBody,
      textBody: existing.textBody ?? null,
      segment: existing.segment ?? ("waitlist_pending" as CampaignSegment),
      status: "draft" as CampaignStatus,
      createdAt: safeDate(existing.createdAt),
      updatedAt: new Date(),
    })
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

  await db.delete(emailCampaigns).where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/campaigns");
  redirect("/admin/email/campaigns");
}

/**
 * OPTIONAL: Apply a template to an existing campaign (fills subject/html/text).
 * This is useful on /campaigns/[id] page if you want a "Template" dropdown.
 */
export async function applyTemplateToCampaign(
  formData: FormData
): Promise<void> {
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

  const vars: TemplateVars = withDefaults(
    {
      // broadcast default: blank (unless you personalize at send-time)
      first_name: "",
      waitlist_link: waitlist_link ?? undefined,
    },
    EMAIL_DEFAULTS
  );

  // ✅ keep templates strict: HTML is required; text is optional
  const subjectTpl = t.subject ?? "";
  if (!t.html) {
    throw new Error(`Template "${templateId}" is missing required "html" content.`);
  }

  const subject = renderString(subjectTpl, vars);
  const htmlBody = renderString(t.html, vars);
  const textBody = renderString(t.text ?? "", vars);

  await db
    .update(emailCampaigns)
    .set({
      subject,
      htmlBody,
      textBody: textBody || null,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${campaignId}`);
  redirect(`/admin/email/campaigns/${campaignId}`);
}
