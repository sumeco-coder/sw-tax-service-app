import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { messages, conversations } from "@/drizzle/schema";
import { and, desc, eq, gte, lt, type SQL } from "drizzle-orm";

export const runtime = "nodejs";

function getAuthFromRequest(req: NextRequest) {
  const token =
    req.cookies.get("idToken")?.value ||
    req.cookies.get("accessToken")?.value;

  if (!token) return null;

  const payload = decodeJwt(token);
  const userId = typeof payload.sub === "string" ? payload.sub : null;

  const role =
    (payload["custom:role"] as string | undefined) ||
    (payload["role"] as string | undefined) ||
    "";

  const isAdmin = ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(role);

  return { userId, role, isAdmin };
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const conversationId = searchParams.get("conversationId");

    const conditions: SQL[] = [];

    // client can only see their own conversations
    if (!auth.isAdmin) {
      conditions.push(eq(conversations.clientId, auth.userId));
    }

    if (conversationId) {
      conditions.push(eq(messages.conversationId, conversationId));
    }

    if (yearParam) {
      const year = Number(yearParam);
      if (!Number.isInteger(year)) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }

      const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

      conditions.push(gte(messages.createdAt, start));
      conditions.push(lt(messages.createdAt, end));
    }

    let q = db
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

        clientId: conversations.clientId,
        subject: conversations.subject,
        lastMessageAt: conversations.lastMessageAt,
        clientUnread: conversations.clientUnread,
        adminUnread: conversations.adminUnread,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .$dynamic();

    if (conditions.length > 0) {
      q = q.where(and(...conditions)!);
    }

    const rows = await q.orderBy(desc(messages.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
