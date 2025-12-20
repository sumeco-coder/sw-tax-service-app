import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { emailUnsubscribes, emailRecipients, emailSubscribers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyUnsubToken } from "@/lib/email/unsubscribe";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";

  const payload = verifyUnsubToken(token);
  if (!payload?.email) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 });
  }

  const email = payload.email.toLowerCase().trim();

  // global unsubscribe list (idempotent)
  await db
    .insert(emailUnsubscribes)
    .values({ email, source: "one-click" })
    .onConflictDoUpdate({
      target: emailUnsubscribes.email,
      set: { unsubscribedAt: new Date(), source: "one-click" },
    });

  // mark any queued/sent rows as unsubscribed
  await db
    .update(emailRecipients)
    .set({ status: "unsubscribed", updatedAt: new Date() })
    .where(eq(emailRecipients.email, email));

  // optional: update master list too
  try {
    await db
      .update(emailSubscribers)
      .set({ status: "unsubscribed", updatedAt: new Date() })
      .where(eq(emailSubscribers.email, email));
  } catch {}

  return NextResponse.json({ ok: true });
}
