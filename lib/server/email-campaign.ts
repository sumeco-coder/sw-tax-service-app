// lib/server/email-campaign.ts
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

function normalizeEmails(raw: string) {
  return raw
    .split(/[\n,]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function buildRecipientsFromAudience(opts: {
  campaignId: string;
  segment: string;
  listId: string | null;
  apptSegment: string | null;
  manualRecipientsRaw: string | null;
}) {
  const { campaignId, segment, listId, apptSegment, manualRecipientsRaw } = opts;

  const emails = new Set<string>();

  // 1) manual
  for (const e of normalizeEmails(manualRecipientsRaw ?? "")) emails.add(e);

  // 2) waitlist segment
  if (String(segment).startsWith("waitlist_")) {
    const wl =
      segment === "waitlist_pending"
        ? await db
            .select({ email: (waitlist as any).email })
            .from(waitlist)
            .where(eq((waitlist as any).status, "pending"))
        : segment === "waitlist_approved"
        ? await db
            .select({ email: (waitlist as any).email })
            .from(waitlist)
            .where(eq((waitlist as any).status, "approved"))
        : await db.select({ email: (waitlist as any).email }).from(waitlist);

    for (const r of wl) {
      const e = String((r as any).email ?? "").toLowerCase().trim();
      if (e) emails.add(e);
    }
  }

  // 3) email list (subscribed only)
  // ✅ use "as any" so you don’t get blocked if your column name differs
  if (listId) {
    const rows = await db
      .select({ email: (emailSubscribers as any).email })
      .from(emailSubscribers)
      .where(
        and(
          eq((emailSubscribers as any).status, "subscribed"),
          eq((emailSubscribers as any).listId, listId)
        )
      );

    for (const r of rows) {
      const e = String((r as any).email ?? "").toLowerCase().trim();
      if (e) emails.add(e);
    }
  }

  // 4) appointment audience (basic: include appointment requests emails)
  // ✅ refine later based on your apptSegment rules
  if (apptSegment) {
    const apptRows = await db
      .select({ email: (appointmentRequests as any).email })
      .from(appointmentRequests);

    for (const r of apptRows) {
      const e = String((r as any).email ?? "").toLowerCase().trim();
      if (e) emails.add(e);
    }
  }

  const finalEmails = Array.from(emails).filter(Boolean);

  if (finalEmails.length === 0) {
    return { inserted: 0 };
  }

  // skip known unsubscribes
  const unsub = await db
    .select({ email: emailUnsubscribes.email })
    .from(emailUnsubscribes)
    .where(inArray(emailUnsubscribes.email, finalEmails));

  const unsubSet = new Set(unsub.map((u) => u.email.toLowerCase()));

  const now = new Date();
  const rows = finalEmails.map((email) => ({
    campaignId,
    email,
    status: unsubSet.has(email) ? ("unsubscribed" as any) : ("queued" as any),
    unsubToken: makeToken(),
    createdAt: now,
    updatedAt: now,
  }));

  await db
    .insert(emailRecipients)
    .values(rows as any)
    .onConflictDoNothing({
      // ✅ requires unique(campaign_id, email) index
      target: [(emailRecipients as any).campaignId, (emailRecipients as any).email],
    } as any);

  return { inserted: rows.length };
}
