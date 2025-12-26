// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/actions/resend-actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients, emailUnsubscribes } from "@/drizzle/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const CHUNK = 1000;

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function normalizeEmail(e: unknown) {
  return String(e ?? "").toLowerCase().trim();
}

function chunk<T>(arr: T[], size = CHUNK) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Creates a NEW campaign copy, and re-queues recipients (excluding unsubscribed).
 * Does NOT send anything.
 */
export async function resendWholeCampaignAsCopy(campaignId: string) {
  const srcId = String(campaignId ?? "").trim();
  if (!srcId) throw new Error("Missing campaignId");

  // 1) Load original campaign
  const [src] = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      subject: emailCampaigns.subject,
      htmlBody: emailCampaigns.htmlBody,
      textBody: emailCampaigns.textBody,
      segment: emailCampaigns.segment,
    })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, srcId))
    .limit(1);

  if (!src) throw new Error("Campaign not found");

  const now = new Date();

  // 2) Duplicate campaign as draft (queue-only)
  const [created] = await db
    .insert(emailCampaigns)
    .values({
      name: `${String(src.name ?? "Campaign")} (Resend Copy)`,
      subject: src.subject,
      htmlBody: src.htmlBody,
      textBody: src.textBody ?? null,
      segment: src.segment as any,

      status: "draft" as any,
      scheduledAt: null,
      sentAt: null,
      schedulerName: null,

      createdAt: now,
      updatedAt: now,
    } as any)
    .returning({ id: emailCampaigns.id });

  const newId = String(created.id);

  // 3) Copy recipient emails from old campaign
  // ✅ also fetch status so we can skip old "unsubscribed" rows
  const oldRecipients = await db
    .select({
      email: emailRecipients.email,
      status: emailRecipients.status,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, srcId));

  const emails = Array.from(
    new Set(
      oldRecipients
        .filter((r) => String(r.status) !== "unsubscribed") // ✅ don’t re-add old unsubscribed
        .map((r) => normalizeEmail(r.email))
        .filter(Boolean)
    )
  );

  if (!emails.length) {
    revalidatePath("/admin/email/campaigns");
    redirect(`/admin/email/campaigns/${newId}`);
    return;
  }

  // 4) Global unsub blocklist (case-insensitive safe)
  const unsub = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(sql`lower(${emailUnsubscribes.email})`, emails));

  const unsubSet = new Set(unsub.map((u) => normalizeEmail(u.email)).filter(Boolean));

  // 5) Insert recipients for the new campaign (queued/unsubscribed)
  const toInsert = emails.map((email) => ({
    campaignId: newId,
    email,
    unsubToken: makeToken(),
    status: unsubSet.has(email) ? ("unsubscribed" as const) : ("queued" as const),
    createdAt: now,
    updatedAt: now,
  }));

  for (const batch of chunk(toInsert, 1000)) {
    await db
      .insert(emailRecipients)
      .values(batch as any)
      .onConflictDoNothing({
        target: [emailRecipients.campaignId, emailRecipients.email],
      } as any);
  }

  revalidatePath("/admin/email/campaigns");
  revalidatePath(`/admin/email/campaigns/${srcId}`);
  redirect(`/admin/email/campaigns/${newId}`);
}
