// app/(admin)/waitlist/actions.ts
"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { waitlist, invites } from "@/drizzle/schema";
import { sendEmail } from "@/lib/email/sendEmail.server";
import { and, eq, gt } from "drizzle-orm";

/**
 * Build a stable base URL for email links.
 * Prefer APP_ORIGIN (canonical), then APP_URL, then request headers, then localhost.
 */
async function getBaseUrl() {
  const envBase =
    process.env.APP_ORIGIN?.trim() ||
    process.env.APP_URL?.trim();

  if (envBase) return envBase.replace(/\/$/, "");

  // Next headers() can be sync or async depending on version/runtime
  const h: any = await Promise.resolve(headers());

  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";

  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`.replace(/\/$/, "");
}

/**
 * Approve a waitlist entry, create (or reuse) a taxpayer invite,
 * and send an onboarding email.
 */
export async function approveWaitlistAndCreateInvite(
  waitlistId: string,
  invitedByUserId?: string
) {
  if (!waitlistId) throw new Error("Missing waitlistId");

  // 1) Load waitlist entry
  const [entry] = await db
    .select()
    .from(waitlist)
    .where(eq(waitlist.id, waitlistId))
    .limit(1);

  if (!entry) throw new Error("Waitlist entry not found");

  if (entry.status === "rejected") {
    throw new Error("Cannot invite a rejected waitlist entry");
  }

  const now = new Date();

  // 2) Try to reuse an existing valid pending invite (prevents duplicates)
  const [existingInvite] = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.email, entry.email),
        eq(invites.type, "taxpayer"),
        eq(invites.status, "pending"),
        gt(invites.expiresAt, now)
      )
    )
    .limit(1);

  let token = existingInvite?.token ?? "";
  let expiresAt = existingInvite?.expiresAt ?? null;
  const reused = Boolean(existingInvite);

  // 3) If no valid invite exists, create a new one
  if (!existingInvite) {
    token = crypto.randomBytes(32).toString("hex");

    const exp = new Date();
    exp.setDate(exp.getDate() + 7);
    expiresAt = exp;

    await db.insert(invites).values({
      email: entry.email,
      type: "taxpayer",
      agencyId: entry.agencyId ?? null,
      token,
      status: "pending",
      expiresAt: exp,
      meta: {
        waitlistId,
        ...(entry.plan ? { plan: entry.plan } : {}),
        invitedBy: invitedByUserId ?? "admin",
      },
    });
  }

  // 4) Approve the waitlist row if it's still pending
  if (entry.status === "pending") {
    await db
      .update(waitlist)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(waitlist.id, waitlistId));
  }

  // 5) Build onboarding URL (safe join + safe query)
  const baseUrl = await getBaseUrl();
  const onboardingUrl = new URL(
    "/taxpayer/onboarding-sign-up",
    baseUrl
  );
  onboardingUrl.searchParams.set("token", token);

  // 6) Send onboarding invite email
  try {
    const subject = "You’re approved to file with SW Tax Service";

    const textBody = [
      `Hi ${entry.fullName || "there"},`,
      "",
      "Good news — you've been approved to file your taxes with SW Tax Service.",
      "",
      "Click the link below to create your secure account and complete onboarding:",
      onboardingUrl.toString(),
      "",
      "If you didn’t request this, you can ignore this email.",
      "",
      "— SW Tax Service",
    ].join("\n");

    const htmlBody = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111827;">
        <p>Hi ${entry.fullName || "there"},</p>
        <p>Good news — you've been <strong>approved to file your taxes with SW Tax Service</strong>.</p>
        <p>Click the button below to create your secure account and complete onboarding:</p>
        <p>
          <a href="${onboardingUrl.toString()}"
             style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;">
            Start your onboarding
          </a>
        </p>
        <p style="margin-top:16px;font-size:12px;color:#6b7280;">
          Or copy and paste this link into your browser:<br/>
          <span style="word-break:break-all;">${onboardingUrl.toString()}</span>
        </p>
        <p style="margin-top:16px;">If you didn’t request this, you can safely ignore this email.</p>
        <p style="margin-top:12px;">— SW Tax Service</p>
      </div>
    `;

    await sendEmail({
      to: entry.email,
      subject,
      htmlBody,
      textBody,
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    // don't throw; approval/invite still succeeds
  }

  // 7) Revalidate admin pages
  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
  // keep these if you truly have them:
  revalidatePath("/waitlist");

  return {
    onboardingUrl: onboardingUrl.toString(),
    token,
    expiresAt,
    reused,
  };
}

/**
 * Reject a waitlist entry.
 */
export async function rejectWaitlist(waitlistId: string) {
  if (!waitlistId) return;

  await db
    .update(waitlist)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(waitlist.id, waitlistId));

  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
  revalidatePath("/waitlist");
}
