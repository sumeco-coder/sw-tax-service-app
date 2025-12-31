// app/(client)/(protected)/messages/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { conversations, messages } from "@/drizzle/schema";
import { eq, desc, sql, and, isNull, ne } from "drizzle-orm";
import { getServerUser } from "@/lib/auth/getServerUser";
import { revalidatePath } from "next/cache";
import Pusher from "pusher";
import { encryptMessage, decryptMessage } from "@/lib/crypto/messageCrypto";
import { findOrCreateConversation } from "@/lib/messages/findOrCreateConversation";

/* ─────────────────────────────────────────────
   Role helpers
───────────────────────────────────────────── */
const STAFF_ROLES = [
  "ADMIN",
  "SUPERADMIN",
  "LMS_ADMIN",
  "SUPPORT_AGENT",
] as const;

function isStaff(role: string) {
  return STAFF_ROLES.includes(role as any);
}

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
   Conversations (client inbox)
───────────────────────────────────────────── */
export async function getClientConversations() {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");

  return db
    .select()
    .from(conversations)
    .where(eq(conversations.clientId, user.userId))
    .orderBy(desc(conversations.lastMessageAt));
}

/* ─────────────────────────────────────────────
   Messages (decrypt on read)
───────────────────────────────────────────── */
export async function getMessages(conversationId: string) {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return rows.map((m) => ({
    ...m,
    body: m.encryptedBody
      ? decryptMessage(m.encryptedBody, m.keyVersion ?? "v1")
      : "",
  }));
}


/* ─────────────────────────────────────────────
   Send message (encrypted)
───────────────────────────────────────────── */
export async function sendMessage(opts: {
  conversationId?: string;
  body: string;
  attachmentUrl?: string;
}) {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");

  const staff = isStaff(user.role);

   const conversation = opts.conversationId
    ? { id: opts.conversationId }
    : await findOrCreateConversation(user.userId);


  /* 1️⃣ Insert encrypted message */
  await db.insert(messages).values({
    conversationId: conversation.id,
    senderUserId: user.userId,
    senderRole: user.role,
    encryptedBody: encryptMessage(opts.body, "v2"),
    keyVersion: "v2",
    body: null, 
    attachmentUrl: opts.attachmentUrl,
    isSystem: false,
  });

  /* 2️⃣ Update conversation + unread counts */
await db.update(conversations).set({
    lastMessageAt: new Date(),
    lastSenderRole: user.role,
    lastSenderUserId: user.userId,
    clientUnread: staff
      ? sql`${conversations.clientUnread} + 1`
      : conversations.clientUnread,
    adminUnread: !staff
      ? sql`${conversations.adminUnread} + 1`
      : conversations.adminUnread,
  }).where(eq(conversations.id, conversation.id));


  /* 3️⃣ Realtime (conversation) */
  await pusher.trigger(
    `conversation-${opts.conversationId}`,
    "new-message",
    { conversationId: opts.conversationId }
  );

  /* 🔔 Global unread sync */
  await pusher.trigger("global-messages", "unread-updated", {
    conversationId: opts.conversationId,
  });

  revalidatePath("/messages");
}


/* ─────────────────────────────────────────────
   Mark conversation as read
───────────────────────────────────────────── */
export async function markConversationAsRead(conversationId: string) {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");

  const staff = isStaff(user.role);

  /* 1️⃣ Mark unread messages as read
     IMPORTANT: only messages NOT sent by viewer
  */
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        isNull(messages.readAt),
        ne(messages.senderUserId, user.userId)
      )
    );

  /* 2️⃣ Reset unread counter */
  await db
    .update(conversations)
    .set(
      staff
        ? { adminUnread: 0 }
        : { clientUnread: 0 }
    )
    .where(eq(conversations.id, conversationId));

  /* 3️⃣ Broadcast global unread update */
  await pusher.trigger("global-messages", "conversation-read", {
    conversationId,
    viewerRole: user.role,
  });

  revalidatePath("/messages");
}

/* ─────────────────────────────────────────────
   Mark conversation as read
───────────────────────────────────────────── */
export async function staffSendMessage(opts: {
  clientId: string;
  body: string;
  attachmentUrl?: string;
}) {
  const staff = await getServerUser();
  if (!staff) throw new Error("Unauthorized");

  // 🔑 ensure conversation exists
  const conversation = await findOrCreateConversation(opts.clientId);

  /* Insert encrypted message */
  await db.insert(messages).values({
    conversationId: conversation.id,
    senderUserId: staff.userId,
    senderRole: staff.role,
    encryptedBody: encryptMessage(opts.body, "v2"),
    keyVersion: "v2",
    body: null,
    attachmentUrl: opts.attachmentUrl,
    isSystem: false,
  });

  /* Update unread counts (client side) */
  await db.update(conversations).set({
    lastMessageAt: new Date(),
    lastSenderRole: staff.role,
    lastSenderUserId: staff.userId,
    clientUnread: sql`${conversations.clientUnread} + 1`,
  }).where(eq(conversations.id, conversation.id));

  /* Realtime */
  await pusher.trigger(
    `conversation-${conversation.id}`,
    "new-message",
    { conversationId: conversation.id }
  );

  await pusher.trigger("global-messages", "unread-updated", {
    conversationId: conversation.id,
  });
}