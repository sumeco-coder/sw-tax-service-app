// app/(admin)/(protected)/messages/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { conversations, users } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";

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
