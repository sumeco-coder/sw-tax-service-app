// app/(admin)/(protected)/messages/_components/AdminConversationList.tsx
"use client";

import clsx from "clsx";

type AdminConversation = {
  id: string;
  subject?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  adminUnread?: number | null;
  lastMessageAt?: Date | string | null;
};

export function AdminConversationList({
  conversations,
  activeId,
  onSelect,
}: {
  conversations: AdminConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="w-[22rem] shrink-0 border-r bg-neutral-50/80 backdrop-blur">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-[#2C2B33]">
          Client Messages
        </h2>
        <p className="text-xs text-neutral-500">
          Secure client communication
        </p>
      </div>

      {/* List */}
      <ul className="space-y-1 p-2">
        {conversations.map((c) => {
          const isActive = c.id === activeId;
          const unread = c.adminUnread ?? 0;

          return (
            <li
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={clsx(
                "relative cursor-pointer rounded-xl px-3 py-2 transition",
                isActive
                  ? "bg-white shadow-sm"
                  : "hover:bg-neutral-100"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-2 h-[70%] w-1 rounded-full bg-[#E72B69]" />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[#2C2B33]">
                    {c.clientName ?? "Client"}
                  </div>
                  <div className="truncate text-xs text-neutral-500">
                    {c.clientEmail}
                  </div>
                </div>

                {unread > 0 && (
                  <span className="rounded-full bg-[#E72B69] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {unread}
                  </span>
                )}
              </div>

              {c.lastMessageAt && (
                <div className="mt-1 text-[11px] text-neutral-400">
                  {new Date(c.lastMessageAt).toLocaleDateString()}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
