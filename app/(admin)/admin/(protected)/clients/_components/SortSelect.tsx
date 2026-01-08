// app/(admin)/admin/(protected)/clients/_components/SortSelect.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

type SortKey = "lastActive" | "name" | "onboarding";

export default function SortSelect({ value }: { value: SortKey }) {
  const router = useRouter();
  const sp = useSearchParams();

  const setSort = React.useCallback(
    (next: SortKey) => {
      const params = new URLSearchParams(sp.toString());
      params.set("sort", next);
      if (!params.get("status")) params.set("status", "all");

      const qs = params.toString();
      router.push(qs ? `/admin/clients?${qs}` : "/admin/clients");
    },
    [router, sp]
  );

  return (
    <div className="relative w-full">
      <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => setSort(e.target.value as SortKey)}
        className="h-10 w-full rounded-2xl border bg-background pl-9 pr-3 text-sm font-semibold outline-none hover:bg-muted"
        aria-label="Sort clients"
      >
        <option value="lastActive">Sort: Last active</option>
        <option value="name">Sort: Name</option>
        <option value="onboarding">Sort: Onboarding step</option>
      </select>
    </div>
  );
}
