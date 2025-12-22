// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/kpi-grid.tsx
import { KpiCard } from "./ui";

export default function KpiGrid({ kpi }: { kpi: any }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KpiCard label="Queued" value={kpi.queued} />
      <KpiCard label="Sent" value={kpi.sent} />
      <KpiCard label="Failed" value={kpi.failed} />
      <KpiCard label="Unsubscribed" value={kpi.unsubscribed} />
      <KpiCard label="Total" value={kpi.total} />
    </div>
  );
}
