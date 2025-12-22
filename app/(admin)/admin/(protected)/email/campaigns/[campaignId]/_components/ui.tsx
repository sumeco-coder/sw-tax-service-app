// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/ui.tsx
export function StatusPill({ status }: { status: string }) {
  const styles =
    status === "sent"
      ? { border: "#22c55e40", bg: "#22c55e14", text: "#166534" }
      : status === "sending"
      ? { border: "#3b82f640", bg: "#3b82f614", text: "#1d4ed8" }
      : status === "failed"
      ? { border: "#ef444440", bg: "#ef444414", text: "#991b1b" }
      : status === "scheduled"
      ? { border: "#f59e0b40", bg: "#f59e0b14", text: "#92400e" }
      : { border: "#a3a3a340", bg: "#00000008", text: "#202030" };

  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ borderColor: styles.border, background: styles.bg, color: styles.text }}
    >
      {status}
    </span>
  );
}

export function SegmentLabel({ seg }: { seg: string }) {
  const label =
    seg === "waitlist_pending"
      ? "Waitlist: Pending"
      : seg === "waitlist_approved"
      ? "Waitlist: Approved"
      : seg === "waitlist_all"
      ? "Waitlist: All"
      : seg;

  return (
    <span className="rounded-full border bg-black/[0.02] px-2.5 py-1 text-xs font-semibold text-[#202030]/80">
      {label}
    </span>
  );
}

export function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-[#202030]/70">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#202030]">{value}</p>
    </div>
  );
}
