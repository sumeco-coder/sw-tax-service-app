"use server";

import { db } from "@/drizzle/db";
import { emailRecipients, emailUnsubscribes } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function confirmUnsubscribeAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return;

  // 1) Find recipient row by token
  const [rec] = await db
    .select()
    .from(emailRecipients)
    .where(eq(emailRecipients.unsubToken, token))
    .limit(1);

  if (!rec) return;

  const email = rec.email.toLowerCase().trim();

  // 2) Add to global unsubscribe list (if not already there)
  await db
    .insert(emailUnsubscribes)
    .values({
      email,
      source: "page",
      unsubscribedAt: new Date(), // you have default now() but explicit is fine
    })
    // ✅ Postgres upsert: ignore if already unsubscribed
    // @ts-ignore (depends on drizzle version typings)
    .onConflictDoNothing();

  // 3) Mark this recipient row too (optional, but nice)
  await db
    .update(emailRecipients)
    .set({ status: "unsubscribed", updatedAt: new Date() })
    .where(eq(emailRecipients.id, rec.id));

  // 4) redirect back to show success state
  redirect(`/unsubscribe?token=${encodeURIComponent(token)}`);
}
