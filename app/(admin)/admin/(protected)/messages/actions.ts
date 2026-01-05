"use server";

import { db } from "@/drizzle/db";
import { conversations, users } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";

// 👇 import the existing server action
import { sendMessage } from "@/app/(client)/(protected)/(app)/messages/actions";

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

// ✅ must be an async function (not a const alias / re-export)
export async function staffSendMessage(input: Parameters<typeof sendMessage>[0]) {
  return sendMessage(input);
}
