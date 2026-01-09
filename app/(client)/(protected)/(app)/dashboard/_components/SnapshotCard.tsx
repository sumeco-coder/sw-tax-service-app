"use client";

import { useRouter } from "next/navigation";
import { cx } from "@/lib/utils/dashboard";


type SnapshotRow = {
  taxYear: number;
  net?: number | null; // matches your YearSnapshot
  status: string;
};

export default function SnapshotCard({
  loading,
  yearSnapshots,
  formatRefundBalance,
}: {
  loading: boolean;
  yearSnapshots: SnapshotRow[];
  formatRefundBalance: (net?: number | null) => string;
}) {
  const router = useRouter();

  const sorted = [...yearSnapshots]
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                {/* Left */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[linear-gradient(90deg,#f00067,#4a0055)] px-2 py-0.5 text-[11px] font-semibold text-white">
                      {row.taxYear}
                    </span>

                    <span className="text-[11px] text-muted-foreground break-words">
                      {formatRefundBalance(row.net)}
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {row.net != null && row.net > 0
                      ? "Refund / Net to you"
                      : row.net != null && row.net < 0
                      ? "Amount you owed"
                      : "Net amount"}
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-1">
                  <span
                    className={cx(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      row.status === "ACCEPTED"
                        ? "bg-emerald-50 text-emerald-700"
                        : row.status === "REJECTED"
                        ? "bg-red-50 text-red-700"
                        : row.status === "FILED" || row.status === "IN_REVIEW"
                        ? "bg-sky-50 text-sky-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {row.status}
                  </span>

                  <span className="text-[11px] text-primary underline-offset-2 hover:underline">
                    View details
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
