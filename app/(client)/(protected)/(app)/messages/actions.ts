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
const STAFF_ROLES = ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "SUPPORT_AGENT"] as const;

function isStaff(role: string) {
  return STAFF_ROLES.includes(role as any);
}

/* ─────────────────────────────────────────────
   Pusher (server-only) — LAZY INIT (prevents build crash)
───────────────────────────────────────────── */
function getPusher() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? "us2";

  // ✅ don’t crash during build/import if env vars aren’t present
  if (!appId || !key || !secret) return null;

  return new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
}

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

  return rows.map((m) => {
    const version = m.keyVersion === "v1" || m.keyVersion === "v2" ? m.keyVersion : "v1";

    return {
      id: m.id,
      conversationId: m.conversationId,
      senderUserId: m.senderUserId,
      senderRole: m.senderRole,
      attachmentUrl: m.attachmentUrl,
      createdAt: m.createdAt,
      readAt: m.readAt,
      isSystem: m.isSystem,
      body: m.encryptedBody ? decryptMessage(m.encryptedBody, version) : "",
    };
  });
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

  const conversationId = conversation.id;

  /* 1️⃣ Insert encrypted message */
  await db.insert(messages).values({
    conversationId,
    senderUserId: user.userId,
    senderRole: user.role,
    encryptedBody: encryptMessage(opts.body, "v2"),
    keyVersion: "v2",
    body: null,
    attachmentUrl: opts.attachmentUrl,
    isSystem: false,
  });

  /* 2️⃣ Update conversation + unread counts */
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastSenderRole: user.role,
      lastSenderUserId: user.userId,
      clientUnread: staff ? sql`${conversations.clientUnread} + 1` : conversations.clientUnread,
      adminUnread: !staff ? sql`${conversations.adminUnread} + 1` : conversations.adminUnread,
    })
    .where(eq(conversations.id, conversationId));

  /* 3️⃣ Realtime */
  const pusher = getPusher();
  if (pusher) {
    await pusher.trigger(`conversation-${conversationId}`, "new-message", {
      conversationId,
    });

    await pusher.trigger("global-messages", "unread-updated", {
      conversationId,
    });
  }

  revalidatePath("/messages");
}

/* ─────────────────────────────────────────────
   Mark conversation as read
───────────────────────────────────────────── */
export async function markConversationAsRead(conversationId: string) {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");

  const staff = isStaff(user.role);

  /* 1️⃣ Mark unread messages as read (not sent by viewer) */
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
    .set(staff ? { adminUnread: 0 } : { clientUnread: 0 })
    .where(eq(conversations.id, conversationId));

  /* 3️⃣ Broadcast global unread update */
  const pusher = getPusher();
  if (pusher) {
    await pusher.trigger("global-messages", "conversation-read", {
      conversationId,
      viewerRole: user.role,
    });
  }

  revalidatePath("/messages");
}

/* ─────────────────────────────────────────────
   Staff: send message to a client (encrypted)
───────────────────────────────────────────── */
export async function staffSendMessage(opts: {
  clientId: string;
  body: string;
  attachmentUrl?: string;
}) {
  const staffUser = await getServerUser();
  if (!staffUser) throw new Error("Unauthorized");
  if (!isStaff(staffUser.role)) throw new Error("Forbidden");

  // ensure conversation exists for this client
  const conversation = await findOrCreateConversation(opts.clientId);
  const conversationId = conversation.id;

  await db.insert(messages).values({
    conversationId,
    senderUserId: staffUser.userId,
    senderRole: staffUser.role,
    encryptedBody: encryptMessage(opts.body, "v2"),
    keyVersion: "v2",
    body: null,
    attachmentUrl: opts.attachmentUrl,
    isSystem: false,
  });

  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastSenderRole: staffUser.role,
      lastSenderUserId: staffUser.userId,
      clientUnread: sql`${conversations.clientUnread} + 1`,
    })
    .where(eq(conversations.id, conversationId));

  const pusher = getPusher();
  if (pusher) {
    await pusher.trigger(`conversation-${conversationId}`, "new-message", {
      conversationId,
    });

    await pusher.trigger("global-messages", "unread-updated", {
      conversationId,
    });
  }

  revalidatePath("/messages");
}
