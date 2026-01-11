// lib/server/email-campaign.ts
import "server-only";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import {
  emailRecipients,
  emailUnsubscribes,
  waitlist,
  emailSubscribers,
  appointmentRequests,
  appointments,
  users,
} from "@/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

// ---- helpers ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeEmail(v: unknown) {
  const e = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!e) return "";
  if (!EMAIL_RE.test(e)) return "";
  return e;
}

function parseEmails(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/g)
    .map((s) => normalizeEmail(s))
    .filter(Boolean);
}

function parseTags(raw: string | null | undefined) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return [];
  return Array.from(
    new Set(
      s
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function chunk<T>(arr: T[], size = 1000) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toPositiveInt(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i > 0 ? i : fallback;
}

type Segment =
  | "waitlist_pending"
  | "waitlist_approved"
  | "waitlist_all"
  | "email_list"
  | "appointments"
  | "manual";

type ApptSegment = "upcoming" | "today" | "past" | "cancelled" | "all";

const SEGMENTS: Segment[] = [
  "waitlist_pending",
  "waitlist_approved",
  "waitlist_all",
  "email_list",
  "appointments",
  "manual",
];

function coerceSegment(v: unknown): Segment {
  const s = String(v ?? "").trim();
  return (SEGMENTS.includes(s as Segment) ? s : "waitlist_pending") as Segment;
}

export type BuildRecipientsFromAudienceOpts = {
  campaignId: string;
  segment: string;
  listId: string | null; // optional for later (email_lists), safe to keep
  apptSegment: string | null;
  manualRecipientsRaw: string | null;

  limit?: number;
  waitlistLimit?: number;
  listLimit?: number;
  apptLimit?: number;
  manualLimit?: number;

  // ✅ New: rebuild behavior
  mode?: "replace" | "append";
};

export async function buildRecipientsFromAudience(
  opts: BuildRecipientsFromAudienceOpts
) {
  const {
    campaignId,
    segment,
    listId,
    apptSegment,
    manualRecipientsRaw,
    limit,
    waitlistLimit,
    listLimit,
    apptLimit,
    manualLimit,
    mode = "replace",
  } = opts;

  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId is required.");

  const DEFAULT_LIMIT = 50_000;
  const base = toPositiveInt(limit, DEFAULT_LIMIT);

  const WL_LIMIT = toPositiveInt(waitlistLimit, base);
  const LIST_LIMIT = toPositiveInt(listLimit, base);
  const APPT_LIMIT = toPositiveInt(apptLimit, base);
  const MANUAL_LIMIT = toPositiveInt(manualLimit, base);

  const seg = coerceSegment(segment);

  // ✅ Replace mode: clear existing recipients for this campaign
  // (your Build button expects “rebuild”, not “append forever”)
  if (mode === "replace") {
    await db
      .delete(emailRecipients)
      .where(
        and(
          eq(emailRecipients.campaignId, id),
          inArray(emailRecipients.status, ["queued", "unsubscribed"] as any)
        )
      );
  }

  const emails = new Set<string>();

  // 1) manual (only when segment=manual)
  if (seg === "manual") {
    for (const e of parseEmails(manualRecipientsRaw).slice(0, MANUAL_LIMIT)) {
      emails.add(e);
    }
  }

  // 2) waitlist segment
  if (
    seg === "waitlist_all" ||
    seg === "waitlist_pending" ||
    seg === "waitlist_approved"
  ) {
    const wlEmailCol = (waitlist as any).email;
    const wlStatusCol = (waitlist as any).status;

    const canFilterStatus = Boolean(wlStatusCol);

    const wlRows =
      seg === "waitlist_pending" && canFilterStatus
        ? await db
            .select({ email: wlEmailCol })
            .from(waitlist)
            .where(eq(wlStatusCol, "pending"))
            .limit(WL_LIMIT)
        : seg === "waitlist_approved" && canFilterStatus
          ? await db
              .select({ email: wlEmailCol })
              .from(waitlist)
              .where(eq(wlStatusCol, "approved"))
              .limit(WL_LIMIT)
          : await db
              .select({ email: wlEmailCol })
              .from(waitlist)
              .limit(WL_LIMIT);

    for (const r of wlRows) {
      const e = normalizeEmail((r as any).email);
      if (e) emails.add(e);
    }
  }

  // 3) email list (subscribed only)
  // ✅ Your app uses TAGS right now (manualRecipientsRaw stores tags when seg=email_list)
  if (seg === "email_list") {
    const listEmailCol = (emailSubscribers as any).email;
    const listStatusCol = (emailSubscribers as any).status;
    const listTagsCol = (emailSubscribers as any).tags;
    const listIdCol = (emailSubscribers as any).listId; // optional, may not exist

    // base: subscribed
    let whereClause: any = eq(listStatusCol, "subscribed");

    // optional listId filter (only if column exists + listId provided)
    if (listId && listIdCol) {
      whereClause = and(whereClause, eq(listIdCol, listId));
    }

    // tag OR filter (ANY tag)
    const tags = parseTags(manualRecipientsRaw);
    if (tags.length && listTagsCol) {
      const tagOr = tags
        .map(
          (t) =>
            sql`(',' || lower(coalesce(${listTagsCol}, '')) || ',') like ${`%,${t},%`}`
        )
        .reduce((acc, cur) => (acc ? sql`${acc} OR ${cur}` : cur), null as any);

      whereClause = and(whereClause, tagOr)!;
    }

    const rows = await db
      .select({ email: listEmailCol })
      .from(emailSubscribers)
      .where(whereClause)
      .limit(LIST_LIMIT);

    for (const r of rows) {
      const e = normalizeEmail((r as any).email);
      if (e) emails.add(e);
    }
  }

  // 4) appointments audience
  if (seg === "appointments") {
    const ap = (String(apptSegment ?? "all") as ApptSegment) || "all";

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const CANCELLED = "cancelled";

    // appointment_requests
    let reqWhere: any = sql`true`;

    if (ap === "cancelled") {
      reqWhere = sql`${(appointmentRequests as any).status} = ${CANCELLED}`;
    } else if (ap === "today") {
      reqWhere = and(
        sql`${(appointmentRequests as any).scheduledAt} >= ${startOfToday}`,
        sql`${(appointmentRequests as any).scheduledAt} < ${endOfToday}`,
        sql`${(appointmentRequests as any).status} != ${CANCELLED}`
      )!;
    } else if (ap === "upcoming") {
      reqWhere = and(
        sql`${(appointmentRequests as any).scheduledAt} >= ${now}`,
        sql`${(appointmentRequests as any).status} != ${CANCELLED}`
      )!;
    } else if (ap === "past") {
      reqWhere = and(
        sql`${(appointmentRequests as any).scheduledAt} < ${now}`,
        sql`${(appointmentRequests as any).status} != ${CANCELLED}`
      )!;
    }

    const reqRows = await db
      .select({ email: (appointmentRequests as any).email })
      .from(appointmentRequests)
      .where(reqWhere)
      .limit(APPT_LIMIT);

    for (const r of reqRows) {
      const e = normalizeEmail((r as any).email);
      if (e) emails.add(e);
    }

    // appointments (booked users)
    let apptWhere: any = sql`true`;

    if (ap === "cancelled") {
      apptWhere = sql`${(appointments as any).status} = ${CANCELLED}`;
    } else if (ap === "today") {
      apptWhere = and(
        sql`${(appointments as any).scheduledAt} >= ${startOfToday}`,
        sql`${(appointments as any).scheduledAt} < ${endOfToday}`,
        sql`${(appointments as any).status} != ${CANCELLED}`
      )!;
    } else if (ap === "upcoming") {
      apptWhere = and(
        sql`${(appointments as any).scheduledAt} >= ${now}`,
        sql`${(appointments as any).status} != ${CANCELLED}`
      )!;
    } else if (ap === "past") {
      apptWhere = and(
        sql`${(appointments as any).scheduledAt} < ${now}`,
        sql`${(appointments as any).status} != ${CANCELLED}`
      )!;
    }

    const apptRows = await db
      .select({ email: (users as any).email })
      .from(appointments)
      .innerJoin(users, eq((users as any).id, (appointments as any).userId))
      .where(apptWhere)
      .limit(APPT_LIMIT);

    for (const r of apptRows) {
      const e = normalizeEmail((r as any).email);
      if (e) emails.add(e);
    }
  }
  const finalEmails = Array.from(emails).slice(0, base);

  if (finalEmails.length === 0) {
    return {
      inserted: 0,
      totalUnique: 0,
      queued: 0,
      unsubscribed: 0,
      insertedQueued: 0,
      insertedUnsubscribed: 0,
    };
  }

  // 5) skip known unsubscribes (case-insensitive)
  const unsubRows = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(
      inArray(sql<string>`lower(${emailUnsubscribes.email})`, finalEmails)
    );

  const unsubSet = new Set(
    (unsubRows ?? []).map((u) => normalizeEmail(u.email)).filter(Boolean)
  );

  const now = new Date();

  const recipientRows = finalEmails.map((email) => {
    const isUnsub = unsubSet.has(email);
    return {
      campaignId: id,
      email,
      status: isUnsub ? ("unsubscribed" as any) : ("queued" as any),
      unsubToken: makeToken(),
      createdAt: now,
      updatedAt: now,
    };
  });

   /* -----------------------------
     6) Insert in chunks + count TRUE inserts
  ------------------------------ */
  let inserted = 0;
  let insertedQueued = 0;
  let insertedUnsubscribed = 0;

  for (const batch of chunk(recipientRows, 1000)) {
    const insertedRows = await db
      .insert(emailRecipients)
      .values(batch as any)
      .onConflictDoNothing({
        target: [
          (emailRecipients as any).campaignId,
          (emailRecipients as any).email,
        ],
      } as any)
      .returning({ email: (emailRecipients as any).email });

    inserted += insertedRows.length;

    // classify inserted rows (so counts match DB reality)
    for (const r of insertedRows) {
      const e = normalizeEmail((r as any).email);
      if (!e) continue;
      if (unsubSet.has(e)) insertedUnsubscribed += 1;
      else insertedQueued += 1;
    }
  }

  const queued = recipientRows.reduce(
    (acc, r) => acc + (r.status === "queued" ? 1 : 0),
    0
  );
  const unsubscribed = recipientRows.length - queued;

  return {
    inserted, // ✅ actually inserted (conflicts excluded)
    totalUnique: recipientRows.length, // ✅ unique audience size
    queued, // attempted queued
    unsubscribed, // attempted unsubscribed
    insertedQueued, // ✅ actually inserted queued
    insertedUnsubscribed, // ✅ actually inserted unsubscribed
  };
}
