// app/(admin)/waitlist/actions.ts
"use server";

import { sendEmail } from "@/lib/email/sendEmail";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { waitlist, invites } from "@/drizzle/schema";
import { headers } from "next/headers";

/**
 * Approve a waitlist entry, create a taxpayer invite,
 * and send an onboarding email via SES.
 */
export async function approveWaitlistAndCreateInvite(
  waitlistId: string,
  invitedByUserId?: string
) {
  if (!waitlistId) {
    throw new Error("Missing waitlistId");
  }

  // 1. Load waitlist entry
  const [entry] = await db
    .select()
    .from(waitlist)
    .where(eq(waitlist.id, waitlistId))
    .limit(1);

  if (!entry) {
    throw new Error("Waitlist entry not found");
  }

  if (entry.status !== "pending") {
    throw new Error(`Cannot approve entry with status: ${entry.status}`);
  }

  // 2. Secure invite token
  const token = crypto.randomBytes(32).toString("hex");

  // 3. Expire after 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // 4. Insert into invites table
  await db.insert(invites).values({
    email: entry.email,
    type: "taxpayer", // taxpayer flow, not LMS
    agencyId: entry.agencyId ?? null,
    token,
    status: "pending",
    expiresAt,
    meta: {
      waitlistId,
      ...(entry.plan ? { plan: entry.plan } : {}),
      invitedBy: invitedByUserId ?? "admin",
    },
  });

  // 5. Build URL for the taxpayer onboarding sign-up

  async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}
  const baseUrl = getBaseUrl();
  const onboardingUrl = `${baseUrl}/taxpayer/onboarding-sign-up?token=${token}`;

  // 6. Update waitlist entry status
  await db
    .update(waitlist)
    .set({
      status: "approved",
      updatedAt: new Date(),
    })
    .where(eq(waitlist.id, waitlistId));

  // 7. Send onboarding invite email (Resend in dev, SES later via sendEmail)

  try {
    const subject = "You’re approved to file with SW Tax Service";

    const textBody = [
      `Hi ${entry.fullName || "there"},`,
      "",
      "Good news — you've been approved to file your taxes with SW Tax Service.",
      "",
      "Click the link below to create your secure account and complete onboarding:",
      onboardingUrl,
      "",
      "If you didn’t request this, you can ignore this email.",
      "",
      "SW Tax Service",
    ].join("\n");

    const htmlBody = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111827;">
        <p>Hi ${entry.fullName || "there"},</p>
        <p>Good news — you've been <strong>approved to file your taxes with SW Tax Service</strong>.</p>
        <p>Click the button below to create your secure account and complete onboarding:</p>
        <p>
          <a href="${onboardingUrl}"
             style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;">
            Start your onboarding
          </a>
        </p>
        <p style="margin-top:16px;font-size:12px;color:#6b7280;">
          Or copy and paste this link into your browser:<br/>
          <span style="word-break:break-all;">${onboardingUrl}</span>
        </p>
        <p style="margin-top:16px;">If you didn’t request this, you can safely ignore this email.</p>
        <p style="margin-top:12px;">SW Tax Service</p>
      </div>
    `;

    await sendEmail({
      to: entry.email,
      subject,
      htmlBody,
      textBody,
    });
  } catch (err) {
    console.error("Failed to send SES invite email:", err);
    // don't throw here so the approval still succeeds
  }

  // 8. Revalidate admin dashboard
  revalidatePath("/waitlist");

  return { onboardingUrl, token };
}

/**
 * Optional: reject a waitlist entry.
 */
export async function rejectWaitlist(waitlistId: string) {
  if (!waitlistId) return;

  await db
    .update(waitlist)
    .set({
      status: "rejected",
      updatedAt: new Date(),
    })
    .where(eq(waitlist.id, waitlistId));

  revalidatePath("/waitlist");
}
