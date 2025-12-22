// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/recipient-picker.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ✅ correct: pulls from [campaignId]/actions.ts
import { addSelectedToCampaign } from "../actions";

type Sub = {
  id: string;
  email: string;
  fullName?: string | null;
  tags?: string | null;
  status: "subscribed" | "unsubscribed" | string;
};

export default function RecipientPicker({
  campaignId,
  subscribers,
  existingEmails,
}: {
  campaignId: string;
  subscribers: Sub[];
  existingEmails: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const existingSet = useMemo(
    () => new Set(existingEmails.map((e) => e.toLowerCase().trim())),
    [existingEmails]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return subscribers;

    return subscribers.filter((s) => {
      const email = String(s.email ?? "").toLowerCase();
      const name = String(s.fullName ?? "").toLowerCase();
      const tags = String(s.tags ?? "").toLowerCase();
      return email.includes(query) || name.includes(query) || tags.includes(query);
    });
  }, [q, subscribers]);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function queueSelected() {
    if (!selectedIds.length) return;

    startTransition(async () => {
      await addSelectedToCampaign({ campaignId, subscriberIds: selectedIds });
      setSelected({});
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#202030]">Pick recipients</h2>
          <p className="text-sm text-[#202030]/70">
            Select people from your Email List and add them to this campaign.
          </p>
        </div>

        <button
          type="button"
          onClick={queueSelected}
          disabled={isPending || selectedIds.length === 0}
          className="rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
        >
          {isPending ? "Adding…" : `Add selected (${selectedIds.length})`}
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, tags…"
          className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border">
        <div className="grid grid-cols-12 bg-black/[0.02] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
          <div className="col-span-1" />
          <div className="col-span-4">Name</div>
          <div className="col-span-5">Email</div>
          <div className="col-span-2">Status</div>
        </div>

        <div className="divide-y">
          {filtered.map((s) => {
            const email = String(s.email ?? "").toLowerCase().trim();
            const alreadyAdded = existingSet.has(email);
            const canSelect = s.status === "subscribed" && !alreadyAdded;

            return (
              <label key={s.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={!!selected[s.id]}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [s.id]: e.target.checked }))
                    }
                    disabled={!canSelect}
                  />
                </div>

                <div className="col-span-4 font-medium text-[#202030]">
                  {s.fullName ?? "—"}
                  {s.tags ? <div className="text-xs text-[#202030]/60">{s.tags}</div> : null}
                </div>

                <div className="col-span-5 text-[#202030]/80">{s.email}</div>

                <div className="col-span-2">
                  <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                    {alreadyAdded ? "already added" : s.status}
                  </span>
                </div>
              </label>
            );
          })}

          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#202030]/60">
              No matches.
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-xs text-[#202030]/60">
        Only <b>subscribed</b> users can be selected. “Already added” means they’re already in this
        campaign (queued/sent/failed/unsubscribed).
      </p>
    </section>
  );
}
