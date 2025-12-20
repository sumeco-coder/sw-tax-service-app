"use server";

import { db } from "@/drizzle/db";
import {
  emailCampaigns,
  emailRecipients,
  emailRecipientStatus,
} from "@/drizzle/schema";
import { and, eq, ilike, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * NOTE:
 * This file expects you export `emailRecipientStatus` from drizzle/schema
 * (pgEnum for recipient status). If you don’t, replace the z.enum(...) with:
 * z.enum(["queued","sent","failed","unsubscribed"] as const)
 */

const RecipientStatusSchema = z.enum(emailRecipientStatus.enumValues);

const IdSchema = z.object({
  id: z.string().uuid("Invalid id."),
});

const RetryFailedSchema = z.object({
  campaignId: z.string().uuid().optional(),
  // optional: limit the number requeued to avoid long updates
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});

const ExportSchema = z.object({
  q: z.string().trim().optional(),
  status: RecipientStatusSchema.optional(),
  campaignId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
});

/* ----------------------------
   Helpers
---------------------------- */

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  // wrap in quotes and double-escape quotes
  return `"${s.replace(/"/g, '""')}"`;
}

/* ----------------------------
   Actions
---------------------------- */

/**
 * Requeue a single recipient (sets queued, clears error, clears sentAt)
 */
export async function requeueRecipient(formData: FormData) {
  const parsed = IdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid id.");

  await db
    .update(emailRecipients)
    .set({
      status: "queued",
      error: null,
      sentAt: null,
      updatedAt: new Date(),
    })
    .where(eq(emailRecipients.id, parsed.data.id));

  revalidatePath("/admin/email/logs");
}

/**
 * Clear error (keeps status the same)
 */
export async function clearRecipientError(formData: FormData) {
  const parsed = IdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid id.");

  await db
    .update(emailRecipients)
    .set({ error: null, updatedAt: new Date() })
    .where(eq(emailRecipients.id, parsed.data.id));

  revalidatePath("/admin/email/logs");
}

/**
 * Delete a recipient row (use carefully)
 */
export async function deleteRecipient(formData: FormData) {
  const parsed = IdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid id.");

  await db
    .delete(emailRecipients)
    .where(eq(emailRecipients.id, parsed.data.id));
  revalidatePath("/admin/email/logs");
}

/**
 * Retry ALL failed recipients (optionally for a single campaign)
 * This is safe because you already have onConflict guards when adding recipients.
 */
export async function retryFailedRecipients(formData: FormData) {
  const parsed = RetryFailedSchema.safeParse({
    campaignId: formData.get("campaignId") || undefined,
    limit: formData.get("limit") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { campaignId, limit } = parsed.data;

  // If limit is provided, select IDs first, then update those IDs.
  if (limit) {
    const rows = await db
      .select({ id: emailRecipients.id })
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.status, "failed"),
          campaignId ? eq(emailRecipients.campaignId, campaignId) : sql`true`
        )
      )
      .limit(limit);

    const ids = rows.map((r) => r.id);
    if (!ids.length) return;

    await db
      .update(emailRecipients)
      .set({
        status: "queued",
        error: null,
        sentAt: null,
        updatedAt: new Date(),
      })
      .where(inArray(emailRecipients.id, ids));
  } else {
    await db
      .update(emailRecipients)
      .set({
        status: "queued",
        error: null,
        sentAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emailRecipients.status, "failed"),
          campaignId ? eq(emailRecipients.campaignId, campaignId) : sql`true`
        )
      );
  }

  revalidatePath("/admin/email/logs");
}

/**
 * Export CSV for the logs view (call from client component).
 * Returns a CSV string (client downloads it).
 */
export async function exportLogsCsv(opts: {
  q?: string;
  status?: z.infer<typeof RecipientStatusSchema>;
  campaignId?: string;
  limit?: number;
}) {
  const parsed = ExportSchema.safeParse({
    q: opts.q,
    status: opts.status,
    campaignId: opts.campaignId || undefined,
    limit: opts.limit ?? 5000,
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid export filters."
    );
  }

  const { q, status, campaignId } = parsed.data;
  const limit = parsed.data.limit ?? 5000; // ✅ always a number

  const where = and(
    status ? eq(emailRecipients.status, status) : sql`true`,
    campaignId ? eq(emailRecipients.campaignId, campaignId) : sql`true`,
    q ? ilike(emailRecipients.email, `%${q}%`) : sql`true`
  );

  const rows = await db
    .select({
      email: emailRecipients.email,
      status: emailRecipients.status,
      error: emailRecipients.error,
      sentAt: emailRecipients.sentAt,
      createdAt: emailRecipients.createdAt,
      campaignId: emailRecipients.campaignId,
      campaignName: emailCampaigns.name,
      subject: emailCampaigns.subject,
    })
    .from(emailRecipients)
    .leftJoin(emailCampaigns, eq(emailCampaigns.id, emailRecipients.campaignId))
    .where(where)
    .orderBy(sql`${emailRecipients.createdAt} desc`)
    .limit(limit);

  const header = [
    "email",
    "status",
    "campaignName",
    "subject",
    "error",
    "sentAt",
    "createdAt",
    "campaignId",
  ];

  const lines = [
    header.map(csvEscape).join(","),
    ...rows.map((r) =>
      [
        r.email,
        r.status,
        r.campaignName ?? "",
        r.subject ?? "",
        r.error ?? "",
        r.sentAt ? new Date(r.sentAt as any).toISOString() : "",
        r.createdAt ? new Date(r.createdAt as any).toISOString() : "",
        r.campaignId ?? "",
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  return lines.join("\n");
}
