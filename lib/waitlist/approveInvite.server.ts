"use server";

import crypto from "crypto";
import { db } from "@/drizzle/db";
import { appSettings, invites, waitlist } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email/sendEmail.server";

type InviteType = "taxpayer" | "lms-preparer";

type ApproveOpts = {
  invitedBy?: "admin" | "system";
  inviteType?: InviteType;
};

type DirectInviteOpts = {
  email: string;
  fullName?: string | null;
  plan?: string | null;
  inviteType?: InviteType;
  invitedBy?: "admin" | "system";
};

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function normalizeEmail(raw: unknown) {
  return String(raw ?? "").toLowerCase().trim();
}

function normalizeBaseUrl(raw: unknown) {
  let s = String(raw ?? "").trim();
  if (!s) s = "https://www.swtaxservice.com";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  s = s.replace(/\/+$/, "");
  return s;
}

/**
 * ✅ Portal host for onboarding links.
 * While app.swtaxservice.com is not live, set APP_ORIGIN to https://www.swtaxservice.com
 * Later switch to https://app.swtaxservice.com
 */
function getAppOrigin() {
  return normalizeBaseUrl(
    process.env.APP_ORIGIN ||
      process.env.APP_URL ||
      process.env.SITE_URL ||
      "https://www.swtaxservice.com"
  );
}

function buildInviteUrl(token: string) {
  const base = getAppOrigin();
  const path = (process.env.WAITLIST_INVITE_PATH || "/taxpayer/onboarding-sign-up").trim();
  const param = (process.env.WAITLIST_INVITE_PARAM || "token").trim();

  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
  url.searchParams.set(param, token);
  return url.toString();
}

async function getBoolSetting(key: string, fallback = false) {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);

  const v = String(row?.value ?? "").trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return fallback;
}

function isExpired(expiresAt: Date | null | undefined) {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
}

async function createInviteRow(opts: {
  email: string;
  type: InviteType;
  meta: Record<string, any>;
}) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = makeToken();
    try {
      const [created] = await db
        .insert(invites)
        .values({
          email: opts.email,
          type: opts.type,
          token,
          status: "pending",
          expiresAt,
          meta: opts.meta,
        })
        .returning();

      return created;
    } catch (err: any) {
      // unique token collision → retry
      if (String(err?.code) === "23505") continue;
      throw err;
    }
  }

  throw new Error("Failed to generate a unique invite token. Try again.");
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

  if (!existing) return null;
  if (isExpired(existing.expiresAt as any)) return null;

  return existing;
}

async function findExistingPendingInviteForEmail(email: string, type: InviteType) {
  const [existing] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.email, email), eq(invites.type, type), eq(invites.status, "pending")))
    .limit(1);

  if (!existing) return null;
  if (isExpired(existing.expiresAt as any)) return null;

  return existing;
}

async function sendInviteEmailMessage(opts: {
  to: string;
  fullName?: string | null;
  inviteUrl: string;
}) {
  const subject = "SW Tax Service — Your onboarding link is ready";
  const name = opts.fullName?.trim() ? opts.fullName.trim() : "there";

  const textBody = [
    `Hi ${name},`,
    "",
    "Your onboarding link is ready. Click below to get started:",
    opts.inviteUrl,
    "",
    "If you didn’t request this, you can ignore this email.",
    "",
    "— SW Tax Service",
  ].join("\n");

  const htmlBody = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 14px; color: #111827;">
      <p>Hi ${name},</p>
      <p>Your onboarding link is ready. Click below to get started:</p>
      <p style="margin: 18px 0;">
        <a href="${opts.inviteUrl}" style="display:inline-block; background:#111827; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px;">
          Start onboarding
        </a>
      </p>
      <p style="color:#6b7280; font-size:12px;">
        If the button doesn’t work, copy and paste this link:<br/>
        <span>${opts.inviteUrl}</span>
      </p>
      <p style="margin-top:18px;">— SW Tax Service</p>
    </div>
  `;

  await sendEmail({ to: opts.to, subject, htmlBody, textBody });
}

/**
 * ✅ Approve waitlist + create/reuse invite + send email
 */
export async function approveWaitlistAndCreateInvite(waitlistId: string, opts: ApproveOpts = {}) {
  const invitedBy = opts.invitedBy ?? "system";
  const inviteType: InviteType = opts.inviteType ?? "taxpayer";

  const [row] = await db.select().from(waitlist).where(eq(waitlist.id, waitlistId)).limit(1);
  if (!row) throw new Error("Waitlist entry not found.");

  const email = normalizeEmail((row as any).email);

  // Reuse existing pending invite for this waitlist row (if not expired)
  let inviteRow = await findExistingPendingInviteForWaitlist(email, String((row as any).id));

  if (!inviteRow) {
    inviteRow = await createInviteRow({
      email,
      type: inviteType,
      meta: {
        waitlistId: String((row as any).id),
        plan: (row as any).plan ?? undefined,
        invitedBy,
        source: "waitlist",
      },
    });
  }

  // Mark waitlist approved (and update timestamp)
  if ((row as any).status !== "approved") {
    await db
      .update(waitlist)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(waitlist.id, String((row as any).id)));
  }

  const inviteUrl = buildInviteUrl(String((inviteRow as any).token));

  await sendInviteEmailMessage({
    to: email,
    fullName: (row as any).fullName ?? null,
    inviteUrl,
  });

  return { waitlist: row, invite: inviteRow, inviteUrl };
}

/**
 * ✅ Direct invite (no waitlist required)
 * gated by app_settings: invitesAllowDirect=true
 */
export async function createDirectInviteAndSendEmail(opts: DirectInviteOpts) {
  const allowDirect = await getBoolSetting("invitesAllowDirect", false);
  if (!allowDirect) {
    throw new Error("Direct invites are disabled. Enable invitesAllowDirect in Admin Settings.");
  }

  const email = normalizeEmail(opts.email);
  if (!email) throw new Error("Email is required.");

  const inviteType: InviteType = opts.inviteType ?? "taxpayer";
  const invitedBy = opts.invitedBy ?? "admin";

  // Reuse existing pending invite for this email/type (if not expired)
  let inviteRow = await findExistingPendingInviteForEmail(email, inviteType);

  if (!inviteRow) {
    inviteRow = await createInviteRow({
      email,
      type: inviteType,
      meta: {
        source: "direct",
        invitedBy,
        fullName: opts.fullName ?? undefined,
        plan: opts.plan ?? undefined,
      },
    });
  }

  const inviteUrl = buildInviteUrl(String((inviteRow as any).token));

  await sendInviteEmailMessage({
    to: email,
    fullName: opts.fullName ?? null,
    inviteUrl,
  });

  return { invite: inviteRow, inviteUrl };
}
