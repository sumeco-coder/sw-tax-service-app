"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { invites, waitlist } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email/sendEmail.server";

type ApproveOpts = {
  invitedBy?: "admin" | "system";
  inviteType?: "taxpayer" | "lms-preparer";
};

function makeToken() {
  // ✅ generated per invite; never goes in .env
  return crypto.randomBytes(24).toString("base64url");
}

function normalizeBaseUrl(raw: string) {
  let s = String(raw || "").trim();
  if (!s) s = "https://swtaxservice.com";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  s = s.replace(/\/+$/, ""); // remove trailing slashes
  return s;
}

function getSiteUrl() {
  return normalizeBaseUrl(
    process.env.SITE_URL ||
      process.env.APP_ORIGIN || // ✅ fixed key
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://swtaxservice.com"
  );
}

function buildInviteUrl(token: string) {
  const base = getSiteUrl();

  // ✅ set defaults to your real onboarding sign-up route + param
  const path = (process.env.WAITLIST_INVITE_PATH || "/taxpayer/onboarding-sign-up").trim();
  const param = (process.env.WAITLIST_INVITE_PARAM || "token").trim();

  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
  url.searchParams.set(param, token);

  return url.toString();
}

async function findExistingPendingInviteForWaitlist(email: string, waitlistId: string) {
  const [existing] = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.email, email.toLowerCase().trim()),
        eq(invites.status, "pending"),
        sql`(${invites.meta} ->> 'waitlistId') = ${waitlistId}`
      )
    )
    .limit(1);

  return existing ?? null;
}

export async function approveWaitlistAndCreateInvite(waitlistId: string, opts: ApproveOpts = {}) {
  const invitedBy = opts.invitedBy ?? "system";
  const inviteType: "taxpayer" | "lms-preparer" = opts.inviteType ?? "taxpayer";

  const [row] = await db
    .select()
    .from(waitlist)
    .where(eq(waitlist.id, waitlistId))
    .limit(1);

  if (!row) throw new Error("Waitlist entry not found.");

  const email = row.email.toLowerCase().trim();

  // ✅ re-use existing PENDING invite for this waitlist row
  const existingInvite = await findExistingPendingInviteForWaitlist(email, row.id);
  let inviteRow = existingInvite;

  if (!inviteRow) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (let attempt = 0; attempt < 3; attempt++) {
      const token = makeToken();
      try {
        const [created] = await db
          .insert(invites)
          .values({
            email,
            type: inviteType,
            agencyId: row.agencyId ?? null,
            token,
            status: "pending",
            expiresAt,
            meta: {
              waitlistId: row.id,
              plan: row.plan ?? undefined,
              invitedBy,
            },
          })
          .returning();

        inviteRow = created;
        break;
      } catch (err: any) {
        // unique token collision → retry
        if (String(err?.code) === "23505") continue;
        throw err;
      }
    }

    if (!inviteRow) throw new Error("Failed to generate a unique invite token. Try again.");
  }

  // ✅ mark waitlist approved
  if (row.status !== "approved") {
    await db.update(waitlist).set({ status: "approved" }).where(eq(waitlist.id, row.id));
  }

  const inviteUrl = buildInviteUrl(inviteRow.token);

  const subject = "SW Tax Service — Your onboarding link is ready";

  const textBody = [
    `Hi ${row.fullName || ""},`.trim(),
    "",
    "Your onboarding link is ready. Click below to get started:",
    inviteUrl,
    "",
    "If you didn’t request this, you can ignore this email.",
    "",
    "— SW Tax Service",
  ].join("\n");

  const htmlBody = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 14px; color: #111827;">
      <p>Hi ${row.fullName ? String(row.fullName) : "there"},</p>
      <p>Your onboarding link is ready. Click below to get started:</p>
      <p style="margin: 18px 0;">
        <a href="${inviteUrl}" style="display:inline-block; background:#111827; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px;">
          Start onboarding
        </a>
      </p>
      <p style="color:#6b7280; font-size:12px;">
        If the button doesn’t work, copy and paste this link:<br/>
        <span>${inviteUrl}</span>
      </p>
      <p style="margin-top:18px;">— SW Tax Service</p>
    </div>
  `;

  await sendEmail({ to: email, subject, htmlBody, textBody });

  return { waitlist: row, invite: inviteRow, inviteUrl };
}
