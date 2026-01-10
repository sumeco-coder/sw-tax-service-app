// app/(admin)/admin/(protected)/messages/_components/AdminConversationList.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessagesSquare, Search, PenSquare } from "lucide-react";

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
  onCompose,
}: {
  conversations: AdminConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCompose: () => void;
}) {
  const [q, setQ] = React.useState("");
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  const totalUnread = React.useMemo(
    () => conversations.reduce((sum, c) => sum + (c.adminUnread ?? 0), 0),
    [conversations]
  );

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return conversations
      .filter((c) => (unreadOnly ? (c.adminUnread ?? 0) > 0 : true))
      .filter((c) => {
        if (!query) return true;
        const name = (c.clientName ?? "client").toLowerCase();
        const email = (c.clientEmail ?? "").toLowerCase();
        const subject = (c.subject ?? "").toLowerCase();
        return name.includes(query) || email.includes(query) || subject.includes(query);
      });
  }, [conversations, q, unreadOnly]);

  const initials = (name?: string | null) => {
    const parts = (name ?? "Client").trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  };

  const formatWhen = (d?: Date | string | null) => {
    if (!d) return null;
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return null;

    const now = new Date();
    const isSameDay =
      dt.getFullYear() === now.getFullYear() &&
      dt.getMonth() === now.getMonth() &&
      dt.getDate() === now.getDate();

    return isSameDay
      ? dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <aside className="flex h-full w-[22rem] shrink-0 flex-col border-r bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl border bg-muted/40">
                <MessagesSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold leading-tight">Client Messages</h2>
                <p className="text-xs text-muted-foreground">Secure client communication</p>
              </div>
            </div>

            {totalUnread > 0 && (
              <Badge variant="secondary" className="shrink-0">
                {totalUnread} unread
              </Badge>
            )}
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, or subject…"
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={!unreadOnly ? "secondary" : "ghost"}
              className="rounded-xl"
              onClick={() => setUnreadOnly(false)}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={unreadOnly ? "secondary" : "ghost"}
              className="rounded-xl"
              onClick={() => setUnreadOnly(true)}
            >
              Unread
            </Button>
          </div>

          {/* ✅ Compose */}
        <Button
  type="button"
  size="sm"
  onClick={onCompose}
  className="mt-3 w-full rounded-xl cursor-pointer transition hover:bg-muted/60 hover:shadow-sm active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring/40"
>
  <PenSquare className="mr-2 h-4 w-4" />
  New message
</Button>


        </div>

        <Separator />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              No conversations found.
            </div>
          ) : (
            <ul className="space-y-1" role="listbox" aria-label="Conversations">
              {filtered.map((c) => {
                const isActive = String(c.id) === String(activeId);
                const unread = c.adminUnread ?? 0;
                const when = formatWhen(c.lastMessageAt);

                return (
                  <li key={c.id} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className={cn(
                        "group relative w-full rounded-2xl px-3 py-3 text-left transition",
                        "hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring/40",
                        isActive ? "bg-muted/30 shadow-sm" : "bg-transparent"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-3 h-[calc(100%-24px)] w-1 rounded-full",
                          isActive ? "bg-primary" : "bg-transparent"
                        )}
                      />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar className="mt-0.5 h-9 w-9">
                            <AvatarFallback className="text-xs">
                              {initials(c.clientName)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-medium">
                                {c.clientName ?? "Client"}
                              </div>
                              {unread > 0 && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>

                            <div className="truncate text-xs text-muted-foreground">
                              {c.clientEmail ?? "—"}
                            </div>

                            {c.subject ? (
                              <div className="mt-1 truncate text-xs text-muted-foreground">
                                {c.subject}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {unread > 0 && (
                            <Badge className="rounded-full px-2 py-0.5 text-[11px]">
                              {unread}
                            </Badge>
                          )}
                          {when && (
                            <div className="text-[11px] text-muted-foreground">{when}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
