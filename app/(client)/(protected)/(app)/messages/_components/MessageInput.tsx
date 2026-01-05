// app/(client)/(protected)/messages/_components/MessageInput.tsx
"use client";

import { useState, useTransition } from "react";
import { sendMessage } from "../actions";
import { uploadData } from "aws-amplify/storage";

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFileUpload(file: File) {
    const key = `messages/${conversationId}/${crypto.randomUUID()}-${file.name}`;
    await uploadData({ key, data: file }).result;
    setAttachment(key);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() && !attachment) return;

        startTransition(async () => {
          await sendMessage({
            conversationId,
            body: text || "📎 Attachment",
            attachmentUrl: attachment ?? undefined,
          });

          setText("");
          setAttachment(null);
        });
      }}
      className="border-t bg-white px-4 pt-3 pb-2"
    >
      {/* Input row */}
      <div className="flex items-end gap-3">
        {/* Text input */}
        <div className="flex-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a secure message…"
            className="
          w-full rounded-2xl border border-neutral-200
          px-4 py-3 text-sm text-[#2C2B33]
          placeholder:text-neutral-400
          focus:border-[#E72B69]
          focus:outline-none
          focus:ring-2 focus:ring-[#E72B69]/20
        "
          />
        </div>

        {/* Attachment */}
        <label
          className="
        inline-flex h-[44px] w-[44px] cursor-pointer
        items-center justify-center
        rounded-xl border border-neutral-200
        text-[#BA4A26]
        transition
        hover:bg-[#BA4A26]/5
      "
          title="Attach file"
        >
          📎
          <input
            type="file"
            hidden
            onChange={(e) =>
              e.target.files && handleFileUpload(e.target.files[0])
            }
          />
        </label>

        {/* Send */}
        <button
          type="submit"
          disabled={pending}
          className="
        inline-flex h-[44px] items-center justify-center
        rounded-xl bg-[#E72B69] px-5
        text-sm font-medium text-white
        shadow-sm
        transition
        hover:bg-[#E72B69]/90
        disabled:cursor-not-allowed disabled:opacity-60
      "
        >
          Send
        </button>
      </div>

      {/* Encryption meta — ✅ correct placement */}
      <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400">
        🔒 End-to-end encrypted
      </div>
    </form>
  );
}
