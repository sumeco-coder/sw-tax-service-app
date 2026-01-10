// app/(admin)/admin/(protected)/messages/_components/AdminMessageThread.tsx
"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import Pusher from "pusher-js";

import { MessageBubble } from "@/app/(client)/(protected)/(app)/messages/_components/MessageBubble";
import { AdminMessageInput } from "../components/AdminMessageInput";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MessageSquareText } from "lucide-react";

import { getConversationMessages, markConversationReadByAdmin } from "../actions";

type ThreadMessage = {
  id: string;
  conversationId: string;
  senderUserId?: string | null;
  senderRole: string;
  body?: string | null;
  text?: string | null;
  encryptedBody?: string;
  attachmentUrl?: string | null;
  encryptedAttachmentMeta?: string | null;
  keyVersion?: string;
  isSystem?: boolean;
  readAt?: Date | string | null;
  createdAt?: Date | string;
};

function normalizeMessages(list: any[]): ThreadMessage[] {
  return (Array.isArray(list) ? list : []).map((m) => ({
    ...m,
    body: m.body ?? m.text ?? "",
    text: m.text ?? m.body ?? "",
  }));
}

function sortByCreatedAt(a: ThreadMessage, b: ThreadMessage) {
  const ta = new Date(a.createdAt ?? 0).getTime();
  const tb = new Date(b.createdAt ?? 0).getTime();
  return ta - tb;
}

export function AdminMessageThread({
  conversationId,
  className,
  onActivity,
}: {
  conversationId: string;
  className?: string;
  onActivity?: () => void;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const fetchMessages = useCallback(async () => {
    const data = await getConversationMessages(conversationId);
    const incoming = normalizeMessages(data as any);

    setMessages((prev) => {
      const map = new Map<string, ThreadMessage>();
      for (const m of prev) map.set(m.id, m);
      for (const m of incoming) map.set(m.id, m);
      return Array.from(map.values()).sort(sortByCreatedAt);
    });
  }, [conversationId]);

  // Mark read when opening
  useEffect(() => {
    markConversationReadByAdmin(conversationId).catch(() => {});
  }, [conversationId]);

  // Initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await fetchMessages();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchMessages]);

  // ✅ Realtime: subscribe to conversation channel
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!key) return;

    const cluster =
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER ||
      process.env.PUSHER_CLUSTER ||
      "us2";

    const pusher = new Pusher(key, { cluster });

    const channelName = `conversation-${conversationId}`;
    const channel = pusher.subscribe(channelName);

    const handler = async () => {
      await fetchMessages().catch(() => {});
      onActivity?.();
    };

    channel.bind("new-message", handler);

    return () => {
      channel.unbind("new-message", handler);
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [conversationId, fetchMessages, onActivity]);

  // Fallback polling (optional safety)
  useEffect(() => {
    const id = setInterval(() => {
      fetchMessages().catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // autoscroll
  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [conversationId, messages.length]);

  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      <div className="flex items-center justify-between border-b bg-background/60 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl border bg-muted/40">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold">Conversation</div>
            <div className="text-xs text-muted-foreground">
              Internal view · replies are sent to the client
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">
              No messages yet. Send the first message below.
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m as any} />)
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t bg-background/60 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <AdminMessageInput
          conversationId={conversationId}
          onSent={(created) => {
            if (!created) return;

            const normalized = normalizeMessages([created as any])[0];

            setMessages((prev) => {
              if (prev.some((p) => p.id === normalized.id)) return prev;
              return [...prev, normalized].sort(sortByCreatedAt);
            });

            onActivity?.();
          }}
        />
      </div>
    </div>
  );
}
