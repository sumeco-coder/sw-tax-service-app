// app/(admin)/(protected)/messages/_components/AdminMessageThread.tsx
"use client";

import { MessageBubble } from "@/app/(client)/(protected)/messages/_components/MessageBubble";
import { AdminMessageInput } from "./AdminMessageInput";
import { getMessages } from "@/app/(client)/(protected)/messages/actions";
import { useEffect, useState } from "react";

export function AdminMessageThread({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    getMessages(conversationId).then(setMessages);
  }, [conversationId]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <AdminMessageInput conversationId={conversationId} />
    </div>
  );
}
