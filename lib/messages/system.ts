// lib/messages/system.ts
"use server";

import { db } from "@/drizzle/db";
import { messages, conversations } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import Pusher from "pusher";

/* ─────────────────────────────────────────────
   Pusher (server-only)
───────────────────────────────────────────── */
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: "us2",
  useTLS: true,
});

/* ─────────────────────────────────────────────
   System message sender
───────────────────────────────────────────── */
export async function sendSystemMessage(conversationId: string, body: string) {
  /* 1️⃣ Insert system message */
  await db.insert(messages).values({
    conversationId,
    body,
    isSystem: true,
    senderUserId: null,
    senderRole: null,
  });

  /* 2️⃣ Update conversation metadata */
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastSenderRole: "system",
      clientUnread: sql`${conversations.clientUnread} + 1`,
    })
    .where(eq(conversations.id, conversationId));

  /* 3️⃣ Realtime push */
  await pusher.trigger(`conversation-${conversationId}`, "new-message", {
    conversationId,
    senderRole: "system",
  });
}
