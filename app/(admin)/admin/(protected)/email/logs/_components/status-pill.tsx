// app/(admin)/admin/(protected)/email/logs/_components/status-pill.tsx
export default function StatusPill({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();

  const styles =
    s === "sent"
      ? { border: "#22c55e40", bg: "#22c55e14", text: "#166534" }
      : s === "queued"
      ? { border: "#3b82f640", bg: "#3b82f614", text: "#1d4ed8" }
      : s === "failed"
      ? { border: "#ef444440", bg: "#ef444414", text: "#991b1b" }
      : s === "unsubscribed"
      ? { border: "#a855f740", bg: "#a855f614", text: "#6b21a8" }
      : { border: "#a3a3a340", bg: "#00000008", text: "#202030" };

  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: styles.border,
        background: styles.bg,
        color: styles.text,
      }}
    >
      {status}
    </span>
  );
}
