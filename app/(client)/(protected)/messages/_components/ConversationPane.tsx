// app/(client)/(protected)/messages/_components/ConversationPane.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Pusher from "pusher-js";

import type { Conversation } from "@/types/messages";
import type { AppRole } from "@/lib/auth/types";

import {
  getClientConversations,
  markConversationAsRead,
} from "../actions";

import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export function ConversationPane({
  viewerRole,
}: {
  viewerRole: AppRole;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [typing, setTyping] = useState<string | null>(null);

  /* Fetch conversations */
  const refreshConversations = useCallback(async () => {
    const data = await getClientConversations();
    setConversations(data);
  }, []);

  /* Initial load */
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  /* Global unread sync */
  useEffect(() => {
    const pusher = new Pusher(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      { cluster: "us2" }
    );

    const channel = pusher.subscribe("global-messages");

    channel.bind("unread-updated", refreshConversations);
    channel.bind("conversation-read", refreshConversations);

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [refreshConversations]);

  /* Typing indicator */
  useEffect(() => {
    if (!activeId) return;

    const pusher = new Pusher(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      { cluster: "us2" }
    );

    const channel = pusher.subscribe(`conversation-${activeId}`);

    channel.bind("typing", ({ role }: { role: AppRole }) => {
      setTyping(
        role === "TAXPAYER"
          ? "Client is typing…"
          : "Staff is typing…"
      );

      setTimeout(() => setTyping(null), 1500);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [activeId]);

  /* Select conversation */
  async function handleSelect(id: string) {
    setActiveId(id);
    await markConversationAsRead(id);
    refreshConversations();
  }

  /* Render */
  return (
   <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]">
  {/* Sidebar */}
  <ConversationList
    conversations={conversations}
    activeId={activeId}
    onSelect={handleSelect}
    viewerRole={viewerRole}
  />

  {/* Thread area */}
  <div className="relative flex flex-1 flex-col bg-white">
    {activeId ? (
      <>
        {/* Typing indicator */}
        {typing && (
          <div className="sticky top-0 z-10 border-b border-black/5 bg-white/80 px-4 py-2 text-xs italic text-[#BA4A26] backdrop-blur">
            {typing}
          </div>
        )}

        <MessageThread conversationId={activeId} />
      </>
    ) : (
      /* Empty state */
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E72B69]/10">
          <svg
            className="h-7 w-7 text-[#E72B69]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h8M8 14h6m-6 5h8a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v8l4 4z"
            />
          </svg>
        </div>

        <p className="text-sm font-medium text-[#2C2B33]">
          No conversation selected
        </p>
        <p className="text-xs text-neutral-500">
          Choose a conversation to start messaging
        </p>
      </div>
    )}
  </div>
</div>

  );
}
