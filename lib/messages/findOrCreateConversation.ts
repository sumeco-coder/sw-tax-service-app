// lib/messages/findOrCreateConversation.ts
"use server";

import { db } from "@/drizzle/db";
import { conversations } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function findOrCreateConversation(clientId: string) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.clientId, clientId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({
      clientId,
      subject: "Secure Messages",
      clientUnread: 0,
      adminUnread: 0,
      lastSenderRole: null,
      lastSenderUserId: null,
    })
    .returning();

  return created;
}
