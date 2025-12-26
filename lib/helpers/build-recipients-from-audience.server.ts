// lib/helpers/build-recipients-from-audience.server.ts
import "server-only";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import {
  emailRecipients,
  emailSubscribers,
  emailUnsubscribes,
  waitlist,
  appointmentRequests,
} from "@/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export type BuildRecipientsFromAudienceOpts = {
  campaignId: string;
  segment: string;
  listId: string | null;
  apptSegment: string | null;
  manualRecipientsRaw: string | null;

  /**
   * ✅ Cleaner knob: set ONE limit and it applies everywhere.
   * (You can still override per-source with the knobs below.)
   */
  limit?: number;

  // Optional per-source knobs (kept for compatibility)
  waitlistLimit?: number;
  listLimit?: number;
  apptLimit?: number;
  manualLimit?: number;
};

function makeUnsubToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function normalizeEmail(e: unknown) {
  return String(e ?? "").trim().toLowerCase();
}

function parseTags(input?: string | null): string[] {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

function parseEmails(raw?: string | null, limit = 50_000) {
  const s = String(raw ?? "").trim();
  if (!s) return [];

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const emails = s
    .split(/[\n,;]+/g)
    .map((x) => normalizeEmail(x))
    .filter((x) => x && emailRe.test(x));

  return Array.from(new Set(emails)).slice(0, limit);
}

function resolveLimits(opts: BuildRecipientsFromAudienceOpts) {
  const base =
    typeof opts.limit === "number" && Number.isFinite(opts.limit) && opts.limit > 0
      ? Math.floor(opts.limit)
      : undefined;

  return {
    waitlistLimit: opts.waitlistLimit ?? base ?? 10_000,
    listLimit: opts.listLimit ?? base ?? 50_000,
    apptLimit: opts.apptLimit ?? base ?? 50_000,
    manualLimit: opts.manualLimit ?? base ?? 50_000,
  };
}

export async function buildRecipientsFromAudience(opts: BuildRecipientsFromAudienceOpts) {
  const id = String(opts.campaignId ?? "").trim();
  if (!id) throw new Error("campaignId is required.");

  const seg = String(opts.segment || "waitlist_pending").trim() || "waitlist_pending";
  const { waitlistLimit, listLimit, apptLimit, manualLimit } = resolveLimits(opts);

  const emails = new Set<string>();

  /* =========================
     1) Manual recipients (ONLY when segment=manual)
     ========================= */
  if (seg === "manual") {
    for (const e of parseEmails(opts.manualRecipientsRaw, manualLimit)) {
      emails.add(e);
    }
  }

  /* =========================
     2) Waitlist segments
     ========================= */
  if (seg.startsWith("waitlist_")) {
    const wl =
      seg === "waitlist_pending"
        ? await db
            .select({ email: waitlist.email })
            .from(waitlist)
            .where(eq(waitlist.status as any, "pending"))
            .limit(waitlistLimit)
        : seg === "waitlist_approved"
        ? await db
            .select({ email: waitlist.email })
            .from(waitlist)
            .where(eq(waitlist.status as any, "approved"))
            .limit(waitlistLimit)
        : await db.select({ email: waitlist.email }).from(waitlist).limit(waitlistLimit);

    for (const r of wl) {
      const e = normalizeEmail(r.email);
      if (e) emails.add(e);
    }
  }

  /* =========================
     3) Email list (subscribers)
     - If you have listId column: use listId
     - Otherwise: segment=email_list uses tags in manualRecipientsRaw
     ========================= */
  if (seg === "email_list") {
    const baseWhere = eq((emailSubscribers as any).status, "subscribed");

    // Prefer listId if your table has it and a listId was provided
    const listIdCol = (emailSubscribers as any).listId;
    if (opts.listId && listIdCol) {
      const rows = await db
        .select({ email: emailSubscribers.email })
        .from(emailSubscribers)
        .where(and(baseWhere, eq(listIdCol, opts.listId)))
        .limit(listLimit);

      for (const r of rows) {
        const e = normalizeEmail(r.email);
        if (e) emails.add(e);
      }
    } else {
      // Otherwise interpret manualRecipientsRaw as tag filters (comma-separated)
      const tags = parseTags(opts.manualRecipientsRaw);

      let whereClause: any = baseWhere;

      if (tags.length) {
        const tagOr = tags
          .map(
            (t) =>
              sql`(',' || lower(coalesce(${(emailSubscribers as any).tags}, '')) || ',') like ${`%,${t},%`}`
          )
          .reduce((acc, cur) => (acc ? sql`${acc} OR ${cur}` : cur), null as any);

        whereClause = and(baseWhere, tagOr)!;
      }

      const rows = await db
        .select({ email: emailSubscribers.email })
        .from(emailSubscribers)
        .where(whereClause)
        .limit(listLimit);

      for (const r of rows) {
        const e = normalizeEmail(r.email);
        if (e) emails.add(e);
      }
    }
  }

  /* =========================
     4) Appointment audience (simple for now)
     ========================= */
  if (seg === "appointments" || opts.apptSegment) {
    const apptRows = await db
      .select({ email: (appointmentRequests as any).email })
      .from(appointmentRequests)
      .limit(apptLimit);

    for (const r of apptRows) {
      const e = normalizeEmail((r as any).email);
      if (e) emails.add(e);
    }
  }

  const finalEmails = Array.from(emails).filter(Boolean);

  if (finalEmails.length === 0) {
    throw new Error("No recipients found. Add manual recipients or select a segment/list.");
  }

  // ✅ Mark known unsubscribes (skip)
  const unsubRows = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, finalEmails));

  const unsubSet = new Set(unsubRows.map((u) => normalizeEmail(u.email)).filter(Boolean));

  const now = new Date();
  const rows = finalEmails.map((email) => ({
    campaignId: id,
    email,
    status: unsubSet.has(email) ? ("unsubscribed" as any) : ("queued" as any),
    unsubToken: makeUnsubToken(),
    createdAt: now,
    updatedAt: now,
  }));

  await db
    .insert(emailRecipients)
    .values(rows as any)
    .onConflictDoNothing({
      target: [emailRecipients.campaignId, emailRecipients.email],
    } as any);

  const queued = finalEmails.filter((e) => !unsubSet.has(e)).length;
  const unsubscribed = finalEmails.length - queued;

  return { total: finalEmails.length, queued, unsubscribed };
}
