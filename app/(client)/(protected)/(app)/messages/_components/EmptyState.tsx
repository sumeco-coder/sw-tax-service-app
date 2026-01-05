// app/(client)/(protected)/messages/_components/EmptyState.tsx
"use client";

import { MessageSquare } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-full bg-[#E72B69]/10 p-4">
        <MessageSquare className="h-6 w-6 text-[#E72B69]" />
      </div>

      <h3 className="text-sm font-semibold text-[#2C2B33]">Secure Messages</h3>

      <p className="max-w-xs text-xs text-neutral-500">
        This is where you’ll securely communicate with your tax team. Select a
        conversation to get started.
      </p>
    </div>
  );
}
