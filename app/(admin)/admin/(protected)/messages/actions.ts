// app/(admin)/admin/(protected)/messages/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { conversations, users, messages } from "@/drizzle/schema";
import { asc, desc, eq, sql, and, isNull } from "drizzle-orm";
import Pusher from "pusher";
import { findOrCreateConversation } from "@/lib/messages/findOrCreateConversation";
import { encryptMessage } from "@/lib/crypto/messageCrypto";

// ✅ Must be a valid value from your userRoleEnum union
const ADMIN_SENDER_ROLE = "SUPPORT_AGENT" as const; // or "ADMIN"

// --- Pusher (same pattern as your system.ts)
function getPusher() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? "us2";
  if (!appId || !key || !secret) return null;
  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

function clean(v: unknown, max = 4000) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

export async function getAllClientConversations() {
  return db
    .select({
      id: conversations.id,
      subject: conversations.subject,
      clientUnread: conversations.clientUnread,
      adminUnread: conversations.adminUnread,
      lastMessageAt: conversations.lastMessageAt,
      clientName: users.name,
      clientEmail: users.email,
    })
    .from(conversations)
    .leftJoin(users, eq(users.id, conversations.clientId))
    .orderBy(desc(conversations.lastMessageAt));
}

export async function getConversationMessages(conversationId: string) {
  return db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderUserId: messages.senderUserId,
      senderRole: messages.senderRole,
      body: messages.body,
      encryptedBody: messages.encryptedBody,
      attachmentUrl: messages.attachmentUrl,
      encryptedAttachmentMeta: messages.encryptedAttachmentMeta,
      keyVersion: messages.keyVersion,
      isSystem: messages.isSystem,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export async function markConversationReadByAdmin(conversationId: string) {
  const cid = clean(conversationId, 200);
  if (!cid) return;

  const now = new Date();

  await db
    .update(conversations)
    .set({ adminUnread: 0 })
    .where(eq(conversations.id, cid));

  await db
    .update(messages)
    .set({ readAt: now })
    .where(and(eq(messages.conversationId, cid), isNull(messages.readAt)));

  revalidatePath("/admin/messages");
}

export async function staffSendMessage(input: { conversationId: string; text: string }) {
  const cid = clean(input.conversationId, 200);
  const body = clean(input.text, 4000);
  if (!cid) throw new Error("staffSendMessage: missing conversationId");
  if (!body) return null;

  const now = new Date();

  // ✅ Real encryption (your helper) + keyVersion stored
  const keyVersion = "v2" as const;
  const encryptedBody = encryptMessage(body, keyVersion);

  const [created] = await db
    .insert(messages)
    .values({
      conversationId: cid,
      senderRole: ADMIN_SENDER_ROLE,
      senderUserId: null, 
      body, 
      encryptedBody,
      keyVersion, 
      isSystem: false,
      createdAt: now,
    })
    .returning({
      id: messages.id,
      conversationId: messages.conversationId,
      senderUserId: messages.senderUserId,
      senderRole: messages.senderRole,
      body: messages.body,
      encryptedBody: messages.encryptedBody,
      attachmentUrl: messages.attachmentUrl,
      encryptedAttachmentMeta: messages.encryptedAttachmentMeta,
      keyVersion: messages.keyVersion,
      isSystem: messages.isSystem,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    });

  // bump convo + increment client unread (staff → client)
  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      lastSenderRole: ADMIN_SENDER_ROLE as any,
      clientUnread: sql`${conversations.clientUnread} + 1`,
    })
    .where(eq(conversations.id, cid));

  // ✅ realtime event for thread
  const pusher = getPusher();
  if (pusher) {
    await pusher.trigger(`conversation-${cid}`, "new-message", {
      conversationId: cid,
      messageId: created?.id,
      senderRole: ADMIN_SENDER_ROLE,
      isSystem: false,
       createdAt: created?.createdAt ?? now,
    });
  }

  revalidatePath("/admin/messages");
  return created ?? null;
}

// ✅ Admin can message client FIRST (creates/reuses convo)
export async function startConversationAndSendFirstMessage(input: {
  clientEmail: string;
  subject?: string;
  text: string;
}) {
  const email = clean(input.clientEmail, 320).toLowerCase();
  const subject = clean(input.subject ?? "Support", 120);
  const text = clean(input.text, 4000);

  if (!email) throw new Error("Missing clientEmail");
  if (!text) return null;

  const [client] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!client) throw new Error("Client not found.");

  // ✅ create/reuse conversation
  const convo = await findOrCreateConversation(client.id, { subject });

  // ✅ send message into it
  await staffSendMessage({ conversationId: convo.id, text });

  revalidatePath("/admin/messages");
  return convo.id;
}
