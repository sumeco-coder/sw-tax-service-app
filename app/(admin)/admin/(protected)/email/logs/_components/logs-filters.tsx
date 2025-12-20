"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exportLogsCsv, retryFailedRecipients } from "../actions";

type CampaignOption = { id: string; name: string };

export default function LogsFilters({
  campaigns,
}: {
  campaigns: CampaignOption[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = React.useState(sp.get("q") ?? "");
  const [status, setStatus] = React.useState(sp.get("status") ?? "");
  const [campaignId, setCampaignId] = React.useState(sp.get("campaignId") ?? "");
  const [exporting, setExporting] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);

  // keep local state in sync if user hits back/forward
  React.useEffect(() => {
    setQ(sp.get("q") ?? "");
    setStatus(sp.get("status") ?? "");
    setCampaignId(sp.get("campaignId") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  function apply() {
    const params = new URLSearchParams(sp.toString());

    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");

    if (status) params.set("status", status);
    else params.delete("status");

    if (campaignId) params.set("campaignId", campaignId);
    else params.delete("campaignId");

    router.push(`/admin/email/logs?${params.toString()}`);
  }

  function clear() {
    router.push("/admin/email/logs");
  }

  async function onExport() {
    setExporting(true);
    try {
      const csv = await exportLogsCsv({
        q: q.trim() || undefined,
        status: (status || undefined) as any,
        campaignId: campaignId || undefined,
        limit: 5000,
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.download = `email-logs-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function onRetryFailed() {
    setRetrying(true);
    try {
      const fd = new FormData();
      if (campaignId) fd.set("campaignId", campaignId);
      fd.set("limit", "2000"); // safe cap for bulk retry
      await retryFailedRecipients(fd);
      // refresh page data
      router.refresh();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#202030]">Filters</h2>
          <p className="text-sm text-[#202030]/70">
            Search and filter delivery logs across campaigns.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onExport}
            disabled={exporting}
            className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>

          <button
            onClick={onRetryFailed}
            disabled={retrying}
            className="rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
            style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
            title="Requeues failed recipients (optionally limited by campaign filter)."
          >
            {retrying ? "Retrying…" : "Retry failed"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <label className="grid gap-1 text-xs font-semibold text-[#202030]/70">
            Search email
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email..."
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
            />
          </label>
        </div>

        <div className="sm:col-span-3">
          <label className="grid gap-1 text-xs font-semibold text-[#202030]/70">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
            >
              <option value="">All</option>
              <option value="queued">queued</option>
              <option value="sent">sent</option>
              <option value="failed">failed</option>
              <option value="unsubscribed">unsubscribed</option>
            </select>
          </label>
        </div>

        <div className="sm:col-span-4">
          <label className="grid gap-1 text-xs font-semibold text-[#202030]/70">
            Campaign
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
            >
              <option value="">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="sm:col-span-12 flex flex-wrap gap-2 pt-1">
          <button
            onClick={apply}
            className="rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
          >
            Apply
          </button>
          <button
            onClick={clear}
            className="rounded-2xl border px-4 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}
