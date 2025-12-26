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
} from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

// ---- helpers ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeEmail(v: unknown) {
  const e = String(v ?? "").trim().toLowerCase();
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

// ---- types ----
export type BuildRecipientsFromAudienceOpts = {
  campaignId: string;
  segment: string;
  listId: string | null;
  apptSegment: string | null;
  manualRecipientsRaw: string | null;

  // ✅ NEW: single knob (recommended)
  limit?: number;

  // ✅ NEW: per-source knobs (optional)
  waitlistLimit?: number;
  listLimit?: number;
  apptLimit?: number;
  manualLimit?: number;
};

// ---- main ----
export async function buildRecipientsFromAudience(opts: BuildRecipientsFromAudienceOpts) {
  const {
    campaignId,
    segment,
    listId,
    apptSegment,
    manualRecipientsRaw,

    // if limit provided, use it as default for everything
    limit,
    waitlistLimit,
    listLimit,
    apptLimit,
    manualLimit,
  } = opts;

  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId is required.");

  const DEFAULT_LIMIT = 50_000;
  const base = toPositiveInt(limit, DEFAULT_LIMIT);

  const WL_LIMIT = toPositiveInt(waitlistLimit, base);
  const LIST_LIMIT = toPositiveInt(listLimit, base);
  const APPT_LIMIT = toPositiveInt(apptLimit, base);
  const MANUAL_LIMIT = toPositiveInt(manualLimit, base);

  const emails = new Set<string>();

  // 1) manual
  for (const e of parseEmails(manualRecipientsRaw).slice(0, MANUAL_LIMIT)) {
    emails.add(e);
  }

  // Centralize "maybe different column names" (keeps your file compiling)
  const wlEmailCol = (waitlist as any).email;
  const wlStatusCol = (waitlist as any).status;

  const listEmailCol = (emailSubscribers as any).email;
  const listStatusCol = (emailSubscribers as any).status;
  const listIdCol = (emailSubscribers as any).listId;

  const apptEmailCol = (appointmentRequests as any).email;

  // 2) waitlist segment
  const seg = String(segment || "waitlist_pending");

  if (seg.startsWith("waitlist_")) {
    // If status column exists, we can filter; otherwise fallback to "all"
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
        : await db.select({ email: wlEmailCol }).from(waitlist).limit(WL_LIMIT);

    for (const r of wlRows) {
      const e = normalizeEmail((r as any).email);
      if (e) emails.add(e);
    }
  }

  // 3) email list (subscribed only)
  if (listId) {
    const canListFilter = Boolean(listStatusCol) && Boolean(listIdCol);

    if (canListFilter) {
      const rows = await db
        .select({ email: listEmailCol })
        .from(emailSubscribers)
        .where(and(eq(listStatusCol, "subscribed"), eq(listIdCol, listId)))
        .limit(LIST_LIMIT);

      for (const r of rows) {
        const e = normalizeEmail((r as any).email);
        if (e) emails.add(e);
      }
    }
  }

  // 4) appointment audience (basic)
  // NOTE: refine later using apptSegment rules — right now it just includes all request emails
  if (apptSegment) {
    const apptRows = await db
      .select({ email: apptEmailCol })
      .from(appointmentRequests)
      .limit(APPT_LIMIT);

    for (const r of apptRows) {
      const e = normalizeEmail((r as any).email);
      if (e) emails.add(e);
    }
  }

  const finalEmails = Array.from(emails);

  if (finalEmails.length === 0) {
    return { inserted: 0, totalUnique: 0, queued: 0, unsubscribed: 0 };
  }

  // 5) skip known unsubscribes
  const unsubRows = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, finalEmails));

  const unsubSet = new Set(
    (unsubRows ?? [])
      .map((u) => String(u.email ?? "").toLowerCase().trim())
      .filter(Boolean)
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

  // 6) Insert in chunks + return true inserted count
  // ✅ requires a unique(campaign_id, email) constraint/index
  let inserted = 0;

  for (const batch of chunk(recipientRows, 1000)) {
    const insertedRows = await db
      .insert(emailRecipients)
      .values(batch as any)
      .onConflictDoNothing({
        target: [(emailRecipients as any).campaignId, (emailRecipients as any).email],
      } as any)
      .returning({ email: (emailRecipients as any).email });

    inserted += insertedRows.length;
  }

  const queued = recipientRows.reduce(
    (acc, r) => acc + (r.status === "queued" ? 1 : 0),
    0
  );
  const unsubscribed = recipientRows.length - queued;

  return {
    inserted, // ✅ actual inserted count (conflicts excluded)
    totalUnique: recipientRows.length,
    queued,
    unsubscribed,
  };
}
