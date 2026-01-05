// app/(client)/(protected)/messages/_components/MessageBubble.tsx
"use client";

import clsx from "clsx";
import type { AppRole } from "@/lib/auth/types";

type Message = {
  id: string;
  body: string;
  senderRole: AppRole;
  isSystem: boolean;
  attachmentUrl?: string | null;
  readAt?: string | Date | null;
  createdAt: string | Date;
};

export function MessageBubble({ message }: { message: Message }) {
  const isStaff =
    message.senderRole === "ADMIN" ||
    message.senderRole === "SUPERADMIN" ||
    message.senderRole === "LMS_ADMIN" ||
    message.senderRole === "SUPPORT_AGENT";

  return (
   <div
  className={clsx(
    "flex w-full",
    message.isSystem
      ? "justify-center"
      : isStaff
      ? "justify-end"
      : "justify-start"
  )}
>
  <div
    className={clsx(
      "relative max-w-[70%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm",
      "transition-all",

      /* System */
      message.isSystem &&
        "bg-[#E72B69]/10 text-[#2C2B33] border border-[#E72B69]/20",

      /* Staff */
      !message.isSystem &&
        isStaff &&
        "bg-[#2C2B33] text-white shadow-md",

      /* Client */
      !message.isSystem &&
        !isStaff &&
        "bg-neutral-100 text-[#2C2B33] border border-black/5"
    )}
  >
    {/* Message body */}
    <div className="whitespace-pre-wrap break-words">
      {message.body}
    </div>

    {/* Attachment */}
    {message.attachmentUrl && (
      <a
        href={message.attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline",
          isStaff
            ? "text-[#E72B69]"
            : "text-[#BA4A26]"
        )}
      >
        📎 View attachment
      </a>
    )}

    {/* Meta */}
    <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-neutral-400">
      <span>
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>

      {message.readAt && (
        <span className="italic text-[#E72B69]">
          Seen
        </span>
      )}
    </div>
  </div>
</div>

  );
}
