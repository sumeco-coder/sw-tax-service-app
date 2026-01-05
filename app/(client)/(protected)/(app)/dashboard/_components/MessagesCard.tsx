// app/(client)/dashboard/_components/MessagesCard.tsx
"use client";

import { FormEvent, RefObject } from "react";
import type { Message } from "@/types/dashboard";
import { fmtDate } from "@/lib/utils/dashboard";

type MessagesCardProps = {
  loading: boolean;
  messages: Message[];
  handleSendMessage: (e: FormEvent<HTMLFormElement>) => Promise<void> | void;
  messageInputRef: RefObject<HTMLInputElement>;
};

export default function MessagesCard({
  loading,
  messages,
  handleSendMessage,
  messageInputRef,
}: MessagesCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">Messages</h3>

      <div className="space-y-2 max-h-64 overflow-auto rounded-lg bg-background/60 p-3 border border-border">
        {loading ? (
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No messages yet. When you or SW Tax send a message, it’ll appear
            here.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="font-semibold">
                {m.sender === "user" ? "SW Tax" : "You"}:
              </span>{" "}
              {m.body}
              {m.createdAt && (
                <span className="text-[10px] text-muted-foreground ml-2">
                  {fmtDate(m.createdAt)}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <form className="mt-3 flex gap-2" onSubmit={handleSendMessage}>
        <input
          ref={messageInputRef}
          className="flex-1 border border-border rounded-lg bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground"
          placeholder="Type a message…"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-[linear-gradient(90deg,#f00067,#4a0055)] 
                     text-xs font-medium text-white shadow-sm shadow-pink-500/30
                     hover:brightness-110 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
