// app/(admin)/(protected)/messages/_components/AdminMessagesShell.tsx
"use client";

import { useState } from "react";
import { AdminConversationList } from "./AdminConversationList";
import { AdminMessageThread } from "./AdminMessageThread";

export function AdminMessagesShell({ conversations }: any) {
  const [activeId, setActiveId] = useState<string | null>(
    conversations[0]?.id ?? null
  );

  return (
    <div className="flex h-full rounded-3xl border bg-white shadow-sm">
      <AdminConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
      />

      {activeId && (
        <AdminMessageThread conversationId={activeId} />
      )}
    </div>
  );
}
