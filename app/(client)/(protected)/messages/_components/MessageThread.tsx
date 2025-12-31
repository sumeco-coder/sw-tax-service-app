// app/(client)/(protected)/messages/_components/MessageThread.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Pusher from "pusher-js";

import { getMessages, markConversationAsRead } from "../actions";
import { MessageInput } from "../_components/MessageInput";
import { MessageBubble } from "../_components/MessageBubble";

export function MessageThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  /* ─────────────────────────────────────────────
     Fetch messages
  ────────────────────────────────────────────── */
  const refreshMessages = useCallback(async () => {
    const data = await getMessages(conversationId);
    setMsgs(data);
  }, [conversationId]);

  /* Initial load + mark read */
  useEffect(() => {
    refreshMessages();
    markConversationAsRead(conversationId);
  }, [refreshMessages, conversationId]);

  /* ─────────────────────────────────────────────
     Realtime (messages + typing)
  ────────────────────────────────────────────── */
  useEffect(() => {
    const pusher = new Pusher(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      { cluster: "us2" }
    );

    const channel = pusher.subscribe(`conversation-${conversationId}`);

    channel.bind("new-message", () => {
      refreshMessages();
    });

    channel.bind(
      "typing",
      ({ role }: { role: "TAXPAYER" | "ADMIN" | "SUPPORT_AGENT" }) => {
        setTyping(
          role === "TAXPAYER"
            ? "Client is typing…"
            : "Staff is typing…"
        );

        // auto-clear after short delay
        if (typingTimeout.current) {
          clearTimeout(typingTimeout.current);
        }

        typingTimeout.current = setTimeout(() => {
          setTyping(null);
        }, 1500);
      }
    );

    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [conversationId, refreshMessages]);

  /* ─────────────────────────────────────────────
     Render
  ────────────────────────────────────────────── */
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-neutral-50 to-white">
  {/* Messages */}
  <div className="flex-1 overflow-y-auto px-6 py-4">
    <div className="mx-auto max-w-3xl space-y-3">
      {msgs.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
    </div>
  </div>

  {/* Typing indicator */}
  {typing && (
    <div className="mx-auto max-w-3xl px-6 pb-1">
      <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs italic text-neutral-500 shadow-sm animate-fade-in">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
        {typing}
      </div>
    </div>
  )}

  {/* Input */}
  <div className="border-t bg-white px-6 py-3">
    <MessageInput conversationId={conversationId} />
  </div>
</div>
  );
}
