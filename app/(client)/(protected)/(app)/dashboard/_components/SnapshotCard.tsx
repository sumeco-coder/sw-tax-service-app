"use client";

import { useRouter } from "next/navigation";
import { formatRefundBalance, cx } from "@/lib/utils/dashboard";


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
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Tax year snapshot
          </h3>
          <p className="text-xs text-muted-foreground">
            A quick look at your recent tax years.
          </p>
        </div>
        {sorted.length > 0 && (
          <span className="hidden md:inline-flex items-center rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            Last {sorted.length} years
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading…
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No prior tax years to show yet. Once we file more returns for you,
          they’ll appear here.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((row) => (
            <button
              key={row.taxYear}
              type="button"
              onClick={() => router.push(`/returns?year=${row.taxYear}`)}
              className="w-full text-left rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted/70 transition flex items-center justify-between gap-3"
            >
              {/* Left: Year + Refund/Bal */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[linear-gradient(90deg,#f00067,#4a0055)] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {row.taxYear}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRefundBalance(row.net)}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {row.net != null && row.net > 0
                    ? "Refund / Net to you"
                    : row.net != null && row.net < 0
                    ? "Amount you owed"
                    : "Net amount"}
                </span>
              </div>

              {/* Right: Status + link */}
              <div className="flex flex-col items-end gap-1">
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
