// lib/waitlist/approveInvite.server.ts
"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { invites, waitlist } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email/sendEmail.server";

type ApproveOpts = {
  invitedBy?: "admin" | "system";
  // override invite type if you ever support more
  inviteType?: "taxpayer" | "lms-preparer";
};

function makeToken() {
  // ✅ auto-generated per invite — you do NOT put this in .env
  return crypto.randomBytes(24).toString("base64url");
}

function getSiteUrl() {
  return (
    process.env.SITE_URL ||
    process.env.APP_ORGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.swtaxservice.com"
  );
}

function buildInviteUrl(token: string) {
  const base = getSiteUrl();
  const path = process.env.WAITLIST_INVITE_PATH || "/onboarding";
  const param = process.env.WAITLIST_INVITE_PARAM || "invite";

  const url = new URL(path, base);
  url.searchParams.set(param, token);
  return url.toString();
}

async function findExistingPendingInviteForWaitlist(email: string, waitlistId: string) {
  const [existing] = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.email, email),
        eq(invites.status, "pending"),
        sql`(${invites.meta} ->> 'waitlistId') = ${waitlistId}`
      )
    )
    .limit(1);

  return existing ?? null;
}

export async function approveWaitlistAndCreateInvite(
  waitlistId: string,
  opts: ApproveOpts = {}
) {
  const invitedBy = opts.invitedBy ?? "system";
  const inviteType: "taxpayer" | "lms-preparer" = opts.inviteType ?? "taxpayer";

  const [row] = await db
    .select()
    .from(waitlist)
    .where(eq(waitlist.id, waitlistId))
    .limit(1);

  if (!row) throw new Error("Waitlist entry not found.");

  // ✅ If already approved, we still allow re-sending invite (idempotent)
  // (keeps production robust)
  const existingInvite = await findExistingPendingInviteForWaitlist(row.email, row.id);

  let inviteRow = existingInvite;

  if (!inviteRow) {
    // expires in 7 days (safe default)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // small collision-safe loop (token is unique)
    for (let attempt = 0; attempt < 3; attempt++) {
      const token = makeToken();
      try {
        const [created] = await db
          .insert(invites)
          .values({
            email: row.email,
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
        // token collision (rare) → retry
        if (String(err?.code) === "23505") continue;
        throw err;
      }
    }

    if (!inviteRow) {
      throw new Error("Failed to generate a unique invite token. Try again.");
    }
  }

  // ✅ Ensure waitlist is marked approved
  if (row.status !== "approved") {
    await db
      .update(waitlist)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(waitlist.id, row.id));
  }

  const inviteUrl = buildInviteUrl(inviteRow.token);

  const subject = "SW Tax Service — Your onboarding link is ready";

  const textBody = [
    `Hi ${row.fullName || ""},`.trim(),
    "",
    "Your onboarding link is ready. Use the link below to get started:",
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

  await sendEmail({
    to: row.email,
    subject,
    htmlBody,
    textBody,
  });

  return { waitlist: row, invite: inviteRow, inviteUrl };
}
