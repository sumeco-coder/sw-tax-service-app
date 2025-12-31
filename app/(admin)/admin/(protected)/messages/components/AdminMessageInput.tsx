"use client";

import { useState, useTransition } from "react";
import { staffSendMessage } from "../actions";

export function AdminMessageInput({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        startTransition(async () => {
          // Adjust the payload to match your existing sendMessage() signature
          await staffSendMessage({
            conversationId,
            text: trimmed,
          } as any);

          setText("");
        });
      }}
      className="flex gap-2"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        className="flex-1 rounded-md border px-3 py-2"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending || !text.trim()}
        className="rounded-md border px-3 py-2"
      >
        Send
      </button>
    </form>
  );
}
