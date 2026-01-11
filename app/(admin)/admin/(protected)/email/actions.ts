// app/(admin)/admin/(protected)/email/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { buildRecipientsFromAudience } from "@/lib/server/email-campaign";

type Segment =
  | "waitlist_pending"
  | "waitlist_approved"
  | "waitlist_all"
  | "email_list"
  | "appointments"
  | "manual";

type ApptSegment = "upcoming" | "today" | "past" | "cancelled" | "all";

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

function parseManualRecipients(input?: string, limit = 200): string[] {
  const s = (input ?? "").trim();
  if (!s) return [];
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emails = s
    .split(/[\n,;]+/g)
    .map((x) => String(x ?? "").toLowerCase().trim())
    .filter((e) => e && emailRe.test(e));
  return [...new Set(emails)].slice(0, limit);
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

  // email list tags (comma separated) — used when segment=email_list
  listTags: z.string().optional().transform((v) => (v ?? "").trim()),

  // appointments
  apptSegment: z.enum(["upcoming", "today", "past", "cancelled", "all"]).optional(),

  // manual
  manualEmails: z.string().optional(),

  limit: z.coerce.number().int().min(1).max(5000).default(200),

  subject: z.string().trim().min(2, "Subject is required."),
  htmlBody: z.string().trim().min(5, "HTML body is required."),

  // allow blank textBody
  textBody: z.string().optional().transform((v) => (v ?? "").trim()),
});

// =========================
// Action (QUEUE ONLY)
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

  // Segment validation
  if (segment === "appointments" && !apptSegment) {
    throw new Error("apptSegment: Please select an appointments segment.");
  }

  if (segment === "manual") {
    const manualParsed = parseManualRecipients(manualEmails, limit);
    if (!manualParsed.length) {
      throw new Error("manualEmails: Paste at least 1 valid email.");
    }
  }

  // 1) Create campaign (status=sending so runner picks it up)
  const [campaign] = await db
    .insert(emailCampaigns)
    .values({
      name: name?.trim() || "Campaign",
      segment: segment as any,

      listId: null,

      apptSegment: segment === "appointments" ? (apptSegment as any) : null,

      // store tags/manual raw for audit & for builder inputs
      manualRecipientsRaw:
        segment === "email_list"
          ? (listTags ?? "").trim()
          : segment === "manual"
          ? (manualEmails ?? "").trim()
          : null,

      status: "sending" as any,
      subject: subjectRaw,
      htmlBody: htmlBodyRaw,
      textBody: (textBodyRaw ?? "").trim().length ? textBodyRaw : null,
      updatedAt: new Date(),
    } as any)
    .returning({ id: emailCampaigns.id });

  // 2) Build recipients (ONE source of truth)
  const result = await buildRecipientsFromAudience({
    campaignId: String(campaign.id),
    segment: segment as Segment,
    listId: null,
    apptSegment: segment === "appointments" ? (apptSegment ?? null) : null,
    manualRecipientsRaw:
      segment === "email_list"
        ? (listTags ?? "").trim()
        : segment === "manual"
        ? (manualEmails ?? "").trim()
        : null,
    limit,
    mode: "replace",
  });

  // 3) If nothing sendable, finalize campaign now (prevents “stuck sending”)
  if ((result?.insertedQueued ?? 0) <= 0) {
    await db
      .update(emailCampaigns)
      .set({
        status: "sent" as any,
        sentAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(emailCampaigns.id, String(campaign.id)));
  }

  // 4) Revalidate admin views
  revalidatePath("/admin/email");
  revalidatePath("/admin/email/campaigns");
  revalidatePath("/admin/email/logs");
}
