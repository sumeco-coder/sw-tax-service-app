"use client";

import { useRouter } from "next/navigation";
import { cx } from "@/lib/utils/dashboard";


type SnapshotRow = {
  taxYear: number;
  net?: number | null; 
  status: string;
};


export default function SnapshotCard({
  loading,
  yearSnapshots = [],
  formatRefundBalance,
}: {
  loading: boolean;
  yearSnapshots?: SnapshotRow[] | null;
  formatRefundBalance: (net?: number | null) => string;
}) {
  const router = useRouter();

    const safe = Array.isArray(yearSnapshots) ? yearSnapshots : [];

   const sorted = safe
    .slice()
    .sort((a, b) => b.taxYear - a.taxYear)
    .slice(0, 5);

  return (
     <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tax year snapshot</h3>
          <p className="text-xs text-muted-foreground">
            A quick look at your recent tax years.
          </p>
        </div>

        {sorted.length > 0 && (
          <span className="inline-flex w-fit items-center rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            Last {sorted.length} years
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No prior tax years to show yet. Once we file more returns for you, they’ll appear here.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((row) => (
            <button
              key={row.taxYear}
              type="button"
              onClick={() => router.push(`/returns?year=${row.taxYear}`)}
              className={cx(
                "w-full text-left rounded-lg border border-border bg-background transition",
                "px-3 py-3 sm:px-4",
                "hover:bg-muted/70 active:scale-[0.99]"
              )}
            >
              {/* ...your existing button content... */}
              {/* (keep as-is) */}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
