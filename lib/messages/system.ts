// lib/messages/system.ts
"use server";

import { db } from "@/drizzle/db";
import { messages, conversations } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: "us2",
  useTLS: true,
});

function clean(v: unknown, max = 4000) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

export async function sendSystemMessage(conversationId: string, body: string) {
  const cid = clean(conversationId, 200);
  const text = clean(body, 4000);

  if (!cid) throw new Error("sendSystemMessage: missing conversationId");
  if (!text) return;

  // ✅ If you have a real encryption helper used elsewhere, replace this with that.
  const encryptedBody = text;

  await db.insert(messages).values({
    conversationId: cid,
    body: text,                // keep if you store plaintext
    encryptedBody,             // ✅ required by your schema
    isSystem: true,
    senderUserId: null,
    senderRole: "SYSTEM",      // ✅ now allowed by your enum
  });

  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastSenderRole: "SYSTEM",
      clientUnread: sql`${conversations.clientUnread} + 1`,
    })
    .where(eq(conversations.id, cid));

  await pusher.trigger(`conversation-${cid}`, "new-message", {
    conversationId: cid,
    senderRole: "SYSTEM",
    isSystem: true,
  });
}
