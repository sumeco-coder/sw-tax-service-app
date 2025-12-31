// app/(client)/(protected)/messages/_components/ConversationList.tsx
"use client";

import clsx from "clsx";
import type { Conversation } from "@/types/messages";
import type { AppRole } from "@/lib/auth/types";

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  viewerRole,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  viewerRole: AppRole;
}) {
  const isStaff =
    viewerRole === "ADMIN" ||
    viewerRole === "SUPERADMIN" ||
    viewerRole === "LMS_ADMIN" ||
    viewerRole === "SUPPORT_AGENT";

  return (
    <aside className="w-80 border-r bg-[#FAFAFA]">
      <div className="px-4 py-3 text-lg font-semibold text-red-300">Messages</div>

      <ul className="space-y-1 px-2">
        {conversations.map((c) => {
          const isActive = activeId === c.id;

          const unread = isStaff ? (c.adminUnread ?? 0) : (c.clientUnread ?? 0);

          return (
            <li
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={clsx(
                "cursor-pointer rounded-xl px-3 py-2 transition",
                isActive ? "bg-neutral-100" : "hover:bg-neutral-50"
              )}
            >
              {/* 🔥 Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-2 h-[70%] w-1 rounded-full bg-[#E72B69]" />
              )}

              {/* Top row */}
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium">
                  {c.subject ?? "Conversation"}
                </div>

                {unread > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                    {unread}
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className="mt-1 flex items-center justify-between text-xs opacity-70">
                <span>
                  Updated {new Date(c.updatedAt).toLocaleDateString()}
                </span>

                {c.lastSenderRole && c.lastSenderRole !== viewerRole && (
                  <span className="font-medium text-green-600">
                    {c.lastSenderRole === "TAXPAYER"
                      ? "Client replied"
                      : "Staff replied"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
