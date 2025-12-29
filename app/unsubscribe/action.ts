// app/unsubscribe/actions.ts
"use server";

import { db } from "@/drizzle/db";
import {
  emailRecipients,
  emailSubscribers,
  emailUnsubscribes,
} from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { verifyUnsubToken } from "@/lib/email/unsubscribe";

/**
 * Confirms an unsubscribe from a signed token.
 * - Idempotent: can be called multiple times safely.
 * - Always redirects to a user-facing result page.
 */
export async function confirmUnsubscribeAction(
  formData: FormData
): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();

  // Always redirect somewhere user-friendly
  if (!token) redirect("/unsubscribe?error=missing_token");

  const payload = verifyUnsubToken(token);
  if (!payload?.email) redirect("/unsubscribe?error=invalid_link");

  const email = payload.email.toLowerCase().trim();

  // 1) Global unsubscribe list (idempotent)
  await db
    .insert(emailUnsubscribes)
    .values({ email, source: "page" })
    .onConflictDoUpdate({
      target: emailUnsubscribes.email,
      set: { unsubscribedAt: new Date(), source: "page" },
    });

  // 2) Mark all recipient rows for this email as unsubscribed
  await db
    .update(emailRecipients)
    .set({ status: "unsubscribed", updatedAt: new Date() })
    .where(eq(emailRecipients.email, email));

  // 3) Optional: also update your master subscriber list
  try {
    await db
      .update(emailSubscribers)
      .set({ status: "unsubscribed", updatedAt: new Date() })
      .where(eq(emailSubscribers.email, email));
  } catch {
    // ignore if emailSubscribers isn't used/enforced
  }

  // 4) Redirect to success page
  redirect(`/unsubscribe?token=${encodeURIComponent(token)}`);
}
