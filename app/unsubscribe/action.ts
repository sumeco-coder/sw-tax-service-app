// app/unsubscribe/actions.ts
// app/unsubscribe/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { emailRecipients, emailSubscribers, emailUnsubscribes } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { verifyUnsubToken } from "@/lib/email/unsubscribe";

export async function confirmUnsubscribeAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return;

  // ✅ signed token verification (no DB lookup needed)
  const payload = verifyUnsubToken(token);
  if (!payload?.email) return;

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
    .set({
      status: "unsubscribed",
      updatedAt: new Date(),
    })
    .where(eq(emailRecipients.email, email));

  // 3) OPTIONAL: also update your master subscriber list
  try {
    await db
      .update(emailSubscribers)
      .set({
        status: "unsubscribed",
        updatedAt: new Date(),
      })
      .where(eq(emailSubscribers.email, email));
  } catch {
    // ignore if you don't want/use emailSubscribers
  }

  // 4) Redirect to success page
  redirect(`/unsubscribe?token=${encodeURIComponent(token)}`);
}
