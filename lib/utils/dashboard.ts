// lib/dashboard.ts

import type { ReturnStatus } from "@/types/dashboard";

// ------------------------------------------------------------------
// Class UI Helpers (safe join for Tailwind classes)
// ------------------------------------------------------------------
export function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

// ------------------------------------------------------------------
// Currency formatter
// ------------------------------------------------------------------
export function currency(v?: string | number | null) {
  if (v == null || v === "") return "—";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "—";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(num);
}

// ------------------------------------------------------------------
// Date formatting
// ------------------------------------------------------------------
export function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
}

export function fmtDateTime(d?: string | Date | null) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";

  return dt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ------------------------------------------------------------------
// Timeline stage index helper
// (your RETURN_TIMELINE_STAGES must be imported where used)
// ------------------------------------------------------------------
export function getTimelineStageIndex(
  status: ReturnStatus["status"],
  stages: Array<{ id: string; matches: string[] }>
): number {
  if (status === "AMENDED") {
    return stages.length - 1;
  }

  const idx = stages.findIndex((stage) =>
    stage.matches.includes(status)
  );

  if (idx === -1) {
    if (status === "DRAFT") return 0; 
    return 0;
  }

  return idx;
}

// ------------------------------------------------------------------
// Refund Balance Helper
// ------------------------------------------------------------------
export function formatRefundBalance(net?: number | null) {
  if (net == null) return "—";

  if (net > 0) return `${currency(net)} refund`;
  if (net < 0) return `${currency(Math.abs(net))} due`;

  return currency(0);
}
