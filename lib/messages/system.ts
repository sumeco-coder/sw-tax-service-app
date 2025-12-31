// lib/messages/system.ts
"use server";

import { db } from "@/drizzle/db";
import { messages, conversations } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import Pusher from "pusher";

function getPusher() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? "us2";

  // ✅ Important: don’t crash during build/module import
  if (!appId || !key || !secret) return null;

  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

function clean(v: unknown, max = 4000) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

export async function sendSystemMessage(conversationId: string, body: string) {
  const cid = clean(conversationId, 200);
  const text = clean(body, 4000);

  if (!cid) throw new Error("sendSystemMessage: missing conversationId");
  if (!text) return;

  // ✅ If you have real encryption, replace this with that helper.
  const encryptedBody = text;

  await db.insert(messages).values({
    conversationId: cid,
    body: text,
    encryptedBody,          // ✅ required by your schema
    isSystem: true,
    senderUserId: null,
    senderRole: "SYSTEM",   // ✅ now in enum
  });

  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastSenderRole: "SYSTEM",
      clientUnread: sql`${conversations.clientUnread} + 1`,
    })
    .where(eq(conversations.id, cid));

  // ✅ Realtime push (skip if env vars aren’t set)
  const pusher = getPusher();
  if (pusher) {
    await pusher.trigger(`conversation-${cid}`, "new-message", {
      conversationId: cid,
      senderRole: "SYSTEM",
      isSystem: true,
    });
  }
}
