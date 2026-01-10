// lib/messages/findOrCreateConversation.ts
"use server";

import { db } from "@/drizzle/db";
import { conversations } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";

export async function findOrCreateConversation(
  clientId: string,
  opts?: { subject?: string }
) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.clientId, clientId))
    .orderBy(desc(conversations.lastMessageAt)) // ✅ return the latest thread
    .limit(1);

  if (existing) return existing;

  const now = new Date();

  const [created] = await db
    .insert(conversations)
    .values({
      clientId,
      subject: opts?.subject ?? "Secure Messages",
      clientUnread: 0,
      adminUnread: 0,
      lastMessageAt: new Date(),
      lastSenderRole: null,
      lastSenderUserId: null,
    })
    .returning();

  return created;
}
