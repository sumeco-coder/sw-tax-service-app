// app/(admin)/admin/(protected)/messages/_components/AdminComposePanel.tsx
"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { startConversationAndSendFirstMessage } from "../actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

export function AdminComposePanel({
  onStarted,
}: {
  onStarted: (conversationId: string) => void;
}) {
  const [clientEmail, setClientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="mb-4">
        <div className="text-sm font-semibold">New message</div>
        <div className="text-xs text-muted-foreground">
          Send a message even if the client hasn’t contacted you yet.
        </div>
      </div>

      <form
        className="max-w-xl space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);

          startTransition(async () => {
            try {
              const convoId = await startConversationAndSendFirstMessage({
                clientEmail,
                subject,
                text,
              });

              if (convoId) {
                setText("");
                onStarted(convoId);
              }
            } catch (err: any) {
              setError(err?.message ?? "Failed to send message.");
            }
          });
        }}
      >
        <Input
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="Client email"
          required
          disabled={pending}
        />

        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          disabled={pending}
        />

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message…"
          required
          disabled={pending}
          className="min-h-[120px]"
        />

        {error && <div className="text-sm text-red-600">{error}</div>}

        <Button type="submit" disabled={pending || !clientEmail.trim() || !text.trim()}>
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </form>
    </div>
  );
}
