"use client";

import { cx } from "class-variance-authority";

export default function DashboardHeader({
  year,
  years,
  setYear,
  status,
  error,
}: {
  year: number;
  years: number[];
  setYear: (y: number) => void;
  status: string;
  error?: string | null;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* ========================= */}
      {/*        TOP BAR            */}
      {/* ========================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Title */}
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your {year} tax year at a glance.
          </p>
        </div>

        {/* Year selector + status */}
        <div className="flex gap-3">
          {/* YEAR SELECT */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm shadow-sm 
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* STATUS BADGE */}
          <span
            className={cx(
              "px-2 py-1 rounded text-xs font-medium self-center",
              status === "ACCEPTED"
                ? "bg-emerald-50 text-emerald-700"
                : status === "REJECTED"
                ? "bg-red-50 text-red-700"
                : status === "FILED" || status === "IN_REVIEW"
                ? "bg-sky-50 text-sky-700"
                : "bg-muted text-muted-foreground"
            )}
            title="Return status"
          >
            {status}
          </span>
        </div>
      </div>

      {/* ========================= */}
      {/*      ERROR MESSAGE        */}
      {/* ========================= */}
      {error && (
        <div className="rounded-md bg-red-50 text-red-800 text-sm p-3 border border-red-200">
          {error}
        </div>
      )}

      {/* ========================= */}
      {/*   BRAND GRADIENT DIVIDER  */}
      {/* ========================= */}
      <div className="mt-2 h-1 w-24 rounded-full bg-[linear-gradient(90deg,#f00067,#4a0055)]"></div>
    </section>
  );
}
