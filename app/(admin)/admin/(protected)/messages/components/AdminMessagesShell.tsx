// app/(admin)/admin/(protected)/messages/_components/AdminMessagesShell.tsx
"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminConversationList } from "./AdminConversationList";
import { AdminMessageThread } from "./AdminMessageThread";
import { AdminComposePanel } from "./AdminComposePanel";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getAllClientConversations } from "../actions";

type AdminConversation = {
  id: string;
  subject?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  adminUnread?: number | null;
  clientUnread?: number | null;
  lastMessageAt?: Date | string | null;
};

export function AdminMessagesShell({
  conversations: initialConversations,
  className,
}: {
  conversations: AdminConversation[];
  className?: string;
}) {
  const [conversations, setConversations] = useState<AdminConversation[]>(
    initialConversations ?? []
  );

  const refreshConversations = useCallback(async () => {
    try {
      const fresh = await getAllClientConversations();
      setConversations(fresh as any);
    } catch {}
  }, []);

  // Live update inbox list
  useEffect(() => {
    refreshConversations();
    const id = setInterval(refreshConversations, 6000);
    return () => clearInterval(id);
  }, [refreshConversations]);

  const firstId = useMemo(
    () => (conversations?.[0]?.id ? String(conversations[0].id) : null),
    [conversations]
  );

  // ✅ If no conversations, go to COMPOSE so admin still has a Send UI
  const [activeId, setActiveId] = useState<string | null>(firstId ?? "COMPOSE");

  // Keep active valid
  useEffect(() => {
    if (!conversations?.length) {
      setActiveId("COMPOSE");
      return;
    }
    if (activeId === "COMPOSE") return;

    const exists = activeId
      ? conversations.some((c) => String(c.id) === String(activeId))
      : false;

    if (!activeId || !exists) setActiveId(String(conversations[0].id));
  }, [conversations, activeId]);

  const handleSelect = (id: string) => {
    setActiveId(id);

    // Optimistically clear unread for UI (server action also clears in thread)
    setConversations((prev) =>
      prev.map((c) => (String(c.id) === String(id) ? { ...c, adminUnread: 0 } : c))
    );
  };

  return (
    <Card
      className={cn(
        "flex h-full w-full overflow-hidden rounded-3xl border bg-background/60 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/40",
        className
      )}
    >
      <AdminConversationList
        conversations={conversations}
        activeId={activeId === "COMPOSE" ? null : activeId}
        onSelect={handleSelect}
        onCompose={() => setActiveId("COMPOSE")}
      />

      <Separator orientation="vertical" />

      {activeId === "COMPOSE" ? (
        <AdminComposePanel
          onStarted={async (conversationId) => {
            await refreshConversations();
            setActiveId(conversationId);
          }}
        />
      ) : activeId ? (
        <AdminMessageThread conversationId={activeId} className="flex-1" />
      ) : null}
    </Card>
  );
}
