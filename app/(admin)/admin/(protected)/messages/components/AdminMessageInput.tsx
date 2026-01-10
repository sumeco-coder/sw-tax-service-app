// app/(admin)/admin/(protected)/messages/components/AdminMessageInput.tsx
"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { staffSendMessage } from "../actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

export function AdminMessageInput({
  conversationId,
  onSent,
  className,
}: {
  conversationId: string;
  onSent?: (created: any | null) => void;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const trimmed = text.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;

        startTransition(async () => {
          const created = await staffSendMessage({ conversationId, text: trimmed });
          setText("");
          onSent?.(created ?? null);
        });
      }}
      className={cn(
        "flex items-end gap-2 rounded-2xl border bg-background/60 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/40",
        className
      )}
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        disabled={pending}
        className="h-11 rounded-xl"
      />

      <Button type="submit" disabled={pending || !trimmed} className="h-11 rounded-xl">
        <Send className="mr-2 h-4 w-4" />
        Send
      </Button>
    </form>
  );
}
