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
import { and, eq, inArray } from "drizzle-orm";

export type BuildRecipientsFromAudienceOpts = {
  campaignId: string;
  segment: string;
  listId: string | null;
  apptSegment: string | null;
  manualRecipientsRaw: string | null;

  // optional knobs
  waitlistLimit?: number;
  listLimit?: number;
  apptLimit?: number;
  manualLimit?: number;
};

export function normalizeEmails(raw: string) {
  return String(raw ?? "")
    .split(/[\n,;]+/g) // ✅ include semicolons too
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function makeUnsubToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function buildRecipientsFromAudience(opts: BuildRecipientsFromAudienceOpts) {
  const {
    campaignId,
    segment,
    listId,
    apptSegment,
    manualRecipientsRaw,

    waitlistLimit = 10_000,
    listLimit = 50_000,
    apptLimit = 50_000,
    manualLimit = 50_000,
  } = opts;

  const id = String(campaignId ?? "").trim();
  if (!id) throw new Error("campaignId is required.");

  const emails = new Set<string>();

  // 1) Manual recipients
  for (const e of normalizeEmails(manualRecipientsRaw ?? "").slice(0, manualLimit)) {
    emails.add(e);
  }

  // 2) Waitlist segment
  const seg = String(segment || "waitlist_pending");

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
      const e = String(r.email ?? "").toLowerCase().trim();
      if (e) emails.add(e);
    }
  }

  // 3) Email list (subscribed only) — only if your emailSubscribers table has listId
  if (listId) {
    const listIdCol = (emailSubscribers as any).listId;
    if (listIdCol) {
      const rows = await db
        .select({ email: emailSubscribers.email })
        .from(emailSubscribers)
        .where(
          and(
            eq((emailSubscribers as any).status, "subscribed"),
            eq(listIdCol, listId)
          )
        )
        .limit(listLimit);

      for (const r of rows) {
        const e = String(r.email ?? "").toLowerCase().trim();
        if (e) emails.add(e);
      }
    }
  }

  // 4) Appointment audience (basic: all appointmentRequests for now)
  // (You can add real apptSegment filtering later)
  if (apptSegment) {
    const apptRows = await db
      .select({ email: (appointmentRequests as any).email })
      .from(appointmentRequests)
      .limit(apptLimit);

    for (const r of apptRows) {
      const e = String((r as any).email ?? "").toLowerCase().trim();
      if (e) emails.add(e);
    }
  }

  const finalEmails = Array.from(emails).filter(Boolean);

  if (finalEmails.length === 0) {
    throw new Error("No recipients found. Add manual recipients or select a segment/list.");
  }

  // Mark known unsubscribes (so they never become queued)
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

  return {
    total: finalEmails.length,
    queued,
    unsubscribed,
  };
}
