// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/actions.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import {
  emailCampaigns,
  emailRecipients,
  emailSubscribers,
  emailUnsubscribes,
} from "@/drizzle/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildRecipientsFromAudience } from "@/lib/server/email-campaign";
import {
  scheduleCampaignExact,
  cancelScheduledCampaign,
} from "@/lib/server/email-scheduler";

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function normalizeEmail(e: unknown) {
  return String(e ?? "").toLowerCase().trim();
}

function readString(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function getQueuedCount(campaignId: string) {
  const [row] = await db
    .select({
      queued: sql<number>`sum(case when ${emailRecipients.status} = 'queued' then 1 else 0 end)::int`,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, campaignId));

  return row?.queued ?? 0;
}

/**
 * Scheduling mode:
 * - default: DB-only (runner checks scheduled_at <= now() on timer)
 * - set EMAIL_SCHEDULE_MODE=aws to use AWS Scheduler (scheduleCampaignExact)
 */
function getScheduleMode() {
  const mode = String(process.env.EMAIL_SCHEDULE_MODE ?? "db").toLowerCase();
  return mode === "aws" ? "aws" : "db";
}

/** ✅ used by RecipientPicker (client component) */
export async function addSelectedToCampaign(opts: {
  campaignId: string;
  subscriberIds: string[];
}) {
  const { campaignId, subscriberIds } = opts;

  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("Missing campaignId");
  if (!subscriberIds?.length) return;

  const subs = await db
    .select({
      id: emailSubscribers.id,
      email: (emailSubscribers as any).email,
      status: (emailSubscribers as any).status,
    })
    .from(emailSubscribers)
    .where(inArray(emailSubscribers.id, subscriberIds));

  const emails = Array.from(
    new Set(
      subs
        .filter((s) => String((s as any).status) === "subscribed")
        .map((s) => normalizeEmail((s as any).email))
        .filter(Boolean)
    )
  );

  if (!emails.length) return;

  // ✅ unsub lookup (best-effort case-insensitive)
  const unsub = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(
      or(
        inArray(emailUnsubscribes.email, emails),
        inArray(sql<string>`lower(${emailUnsubscribes.email})`, emails)
      )
    );

  const unsubSet = new Set(
    unsub.map((u) => normalizeEmail(u.email)).filter(Boolean)
  );

  const now = new Date();
  const rows = emails.map((email) => ({
    campaignId: id,
    email,
    unsubToken: makeToken(),
    status: unsubSet.has(email) ? ("unsubscribed" as any) : ("queued" as any),
    createdAt: now,
    updatedAt: now,
  }));

  await db
    .insert(emailRecipients)
    .values(rows as any)
    .onConflictDoNothing({
      // ✅ requires unique(campaign_id, email)
      target: [
        (emailRecipients as any).campaignId,
        (emailRecipients as any).email,
      ],
    } as any);

  revalidatePath(`/admin/email/campaigns/${id}`);
}

/** ✅ audience save + optional build (one form, two buttons) */
export async function saveAudienceOrBuild(
  campaignId: string,
  formData: FormData
) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("Missing campaignId");

  const intent = readString(formData, "intent") || "save";

  const segment =
    (readString(formData, "segment") || "waitlist_pending").trim() ||
    "waitlist_pending";

  const listIdRaw = readString(formData, "listId");
  const apptSegmentRaw = readString(formData, "apptSegment");
  const manualRaw = readString(formData, "manualRecipientsRaw");

  const listId = listIdRaw ? listIdRaw : null;
  const apptSegment = apptSegmentRaw ? apptSegmentRaw : null;
  const manualRecipientsRaw = manualRaw ? manualRaw : null;

  await db
    .update(emailCampaigns)
    .set({
      segment: segment as any,
      listId,
      apptSegment,
      manualRecipientsRaw,
      updatedAt: new Date(),
    } as any)
    .where(eq(emailCampaigns.id, id));

  if (intent === "build") {
    await buildRecipientsFromAudience({
      campaignId: id,
      segment,
      listId,
      apptSegment,
      manualRecipientsRaw,
    });
  }

  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}

/**
 * Schedule send for a campaign.
 * - Auto-builds recipients if none queued yet (based on saved audience).
 * - DB-only schedule by default (EMAIL_SCHEDULE_MODE=db)
 * - Optional AWS Scheduler mode (EMAIL_SCHEDULE_MODE=aws)
 */
export async function scheduleSend(campaignId: string, formData: FormData) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("Missing campaignId");

  // Accept either field name to prevent form mismatch bugs
  const sendAtIso =
    readString(formData, "sendAt") || readString(formData, "scheduledAtIso");
  const sendAtLocal = readString(formData, "sendAtLocal"); // optional debug

  if (!sendAtIso) throw new Error("Pick a date/time.");

  const sendAt = new Date(sendAtIso);
  if (Number.isNaN(sendAt.getTime())) {
    throw new Error(
      `Invalid date/time. (local="${sendAtLocal}", iso="${sendAtIso}")`
    );
  }

  if (sendAt.getTime() < Date.now() + 60_000) {
    throw new Error("Send time must be at least 1 minute in the future.");
  }

  // If nothing queued, auto-build from saved audience
  let queued = await getQueuedCount(id);

  if (queued <= 0) {
    const [c] = await db
      .select({
        segment: emailCampaigns.segment,
        listId: emailCampaigns.listId,
        apptSegment: emailCampaigns.apptSegment,
        manualRecipientsRaw: emailCampaigns.manualRecipientsRaw,
      })
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id))
      .limit(1);

    await buildRecipientsFromAudience({
      campaignId: id,
      segment: String(c?.segment ?? "waitlist_pending"),
      listId: c?.listId ? String(c.listId) : null,
      apptSegment: c?.apptSegment ? String(c.apptSegment) : null,
      manualRecipientsRaw: c?.manualRecipientsRaw
        ? String(c.manualRecipientsRaw)
        : null,
    });

    queued = await getQueuedCount(id);

    if (queued <= 0) {
      throw new Error(
        "No queued recipients. Choose a segment/list or add manual recipients, then Build recipients."
      );
    }
  }

  const mode = getScheduleMode();

  if (mode === "aws") {
    const scheduleName = await scheduleCampaignExact({
      campaignId: id,
      sendAt,
    });

    await db
      .update(emailCampaigns)
      .set({
        status: "scheduled" as any,
        scheduledAt: sendAt,
        schedulerName: scheduleName,
        updatedAt: new Date(),
      } as any)
      .where(eq(emailCampaigns.id, id));
  } else {
    // ✅ DB-only schedule (runner will pick up within its interval)
    await db
      .update(emailCampaigns)
      .set({
        status: "scheduled" as any,
        scheduledAt: sendAt,
        schedulerName: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(emailCampaigns.id, id));
  }

  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}

export async function cancelSchedule(campaignId: string) {
  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("Missing campaignId");

  // If AWS mode (or if you previously stored a schedulerName), cancel remote schedule too
  const [c] = await db
    .select({ schedulerName: emailCampaigns.schedulerName })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);

  const mode = getScheduleMode();
  const hadAwsSchedule = Boolean((c as any)?.schedulerName);

  if (mode === "aws" || hadAwsSchedule) {
    try {
      await cancelScheduledCampaign(id);
    } catch {
      // ignore
    }
  }

  await db
    .update(emailCampaigns)
    .set({
      status: "draft" as any,
      scheduledAt: null,
      schedulerName: null,
      updatedAt: new Date(),
    } as any)
    .where(eq(emailCampaigns.id, id));

  revalidatePath(`/admin/email/campaigns/${id}`);
  redirect(`/admin/email/campaigns/${id}`);
}
