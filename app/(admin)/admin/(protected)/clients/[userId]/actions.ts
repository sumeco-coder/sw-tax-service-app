// app/(admin)/admin/(protected)/clients/[userId]/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrRedirect, revalidateClientPaths } from "../_helpers";

function normalizeEmail(v: string) {
  return String(v ?? "").trim().toLowerCase();
}

// Used for building links in the email
function getBaseUrl() {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return env.replace(/\/$/, "");
}

// Minimal Resend sender (no dependency on your lib/email files)
async function sendResendEmail(to: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY env var.");

  const baseUrl = getBaseUrl();
  if (!baseUrl) throw new Error("Missing site URL env var (NEXT_PUBLIC_APP_URL / SITE_URL / APP_URL).");

  // Adjust this path if your invite link is different
  const link = `${baseUrl}/sign-in`;

  const subject = "Your SW Tax Service portal link";
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.4;">
      <h2 style="margin:0 0 12px;">You're invited to continue in the SW Tax Service portal</h2>
      <p style="margin:0 0 16px;">Use the link below to sign in and continue your onboarding.</p>
      <p style="margin:0 0 20px;">
        <a href="${link}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#E72B69;color:#fff;text-decoration:none;font-weight:600;">
          Open Portal
        </a>
      </p>
      <p style="margin:0;color:#666;font-size:12px;">If the button doesn’t work, copy/paste this link: ${link}</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // ⚠️ must be a verified sender in Resend
      from: "SW Tax Service <support@swtaxservice.com>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Resend failed (${res.status}). ${err}`);
  }
}

export async function adminResendClientInvite(email: string) {
  await requireAdminOrRedirect();

  const to = normalizeEmail(email);
  if (!to || !to.includes("@")) throw new Error("Invalid email.");

  await sendResendEmail(to);
  return { ok: true };
}

export async function adminUpdateClientProfile(
  userId: string,
  patch: {
    name?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    filingStatus?: string;
  }
) {
  await requireAdminOrRedirect();

  await db
    .update(users)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidateClientPaths(userId);
  return { ok: true };
}
