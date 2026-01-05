// app/(client)/(protected)/messages/_components/MessageShell.tsx
"use client";

import { useState } from "react";
import type { Conversation } from "@/types/messages";
import type { AppRole } from "@/lib/auth/types";

import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";
import { EmptyState } from "./EmptyState";

type Props = {
  conversations: Conversation[];
  viewerRole: AppRole;
};

export function MessagesShell({
  conversations,
  viewerRole,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(
    conversations.length > 0 ? conversations[0].id : null
  );

  return (
     <div className="flex h-full overflow-hidden rounded-3xl border bg-white shadow-sm ring-1 ring-black/5">
      {/* Sidebar */}
      <aside className="flex w-[22rem] shrink-0 flex-col border-r bg-neutral-50/80 backdrop-blur">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          viewerRole={viewerRole}
        />
        
      </aside>

      {/* Thread */}
      <section className="relative flex flex-1 flex-col bg-white">
        {activeId ? (
          <MessageThread conversationId={activeId} />
        ) : (
          <EmptyState />
        )}
      </section>
    </div>
  );
}