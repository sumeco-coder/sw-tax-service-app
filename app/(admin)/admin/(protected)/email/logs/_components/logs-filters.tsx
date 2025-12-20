"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Campaign = { id: string; name: string };

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

export default function LogsFilters({
  campaigns,
  initial,
}: {
  campaigns: Campaign[];
  initial: { q: string; status: string; campaignId: string };
}) {
  const router = useRouter();

  const [q, setQ] = useState(initial.q ?? "");
  const [status, setStatus] = useState(initial.status ?? "");
  const [campaignId, setCampaignId] = useState(initial.campaignId ?? "");

  const hasAnyFilter = Boolean(q || status || campaignId);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (campaignId) sp.set("campaignId", campaignId);
    const s = sp.toString();
    return s ? `?${s}` : "";
  }, [q, status, campaignId]);

  function apply() {
    router.push(`/admin/email/logs${queryString}`);
  }

  function reset() {
    setQ("");
    setStatus("");
    setCampaignId("");
    router.push("/admin/email/logs");
  }

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
        {/* Search */}
        <div className="sm:col-span-5">
          <label className="block text-xs font-semibold text-[#202030]/70">
            Search email
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
            placeholder="example@email.com"
            className="mt-1 w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        {/* Status */}
        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-[#202030]/70">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Campaign */}
        <div className="sm:col-span-4">
          <label className="block text-xs font-semibold text-[#202030]/70">
            Campaign
          </label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="mt-1 w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="sm:col-span-12 flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={reset}
            disabled={!hasAnyFilter}
            className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-50"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={apply}
            className="rounded-2xl bg-[#202030] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}

