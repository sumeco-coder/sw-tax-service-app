import Link from "next/link";
import { clearRecipientError, deleteRecipient, requeueRecipient } from "../actions";

type Row = {
  id: string;
  email: string;
  status: string;
  error: string | null;
  sentAt: Date | string | null;
  createdAt: Date | string;
  campaignId: string | null;
  campaignName: string | null;
};

export default function LogsTable({ rows }: { rows: Row[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="grid grid-cols-12 bg-black/[0.02] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
        <div className="col-span-4">Email</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-3">Campaign</div>
        <div className="col-span-2">When</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      <div className="divide-y">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-12 items-center px-5 py-3 text-sm">
            <div className="col-span-4 font-medium text-[#202030]">
              {r.email}
              {r.error ? (
                <div className="mt-1 text-xs text-[#991b1b]" title={r.error}>
                  {r.error.slice(0, 110)}
                </div>
              ) : null}
            </div>

            <div className="col-span-2">
              <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                {r.status}
              </span>
            </div>

            <div className="col-span-3 text-[#202030]/80">
              {r.campaignName && r.campaignId ? (
                <Link
                  href={`/admin/email/campaigns/${r.campaignId}`}
                  className="font-semibold hover:underline"
                >
                  {r.campaignName}
                </Link>
              ) : (
                <span className="text-xs text-[#202030]/60">—</span>
              )}
            </div>

            <div className="col-span-2 text-xs text-[#202030]/70">
              {r.sentAt ? (
                <span>{new Date(r.sentAt as any).toLocaleString()}</span>
              ) : (
                <span>{new Date(r.createdAt as any).toLocaleString()}</span>
              )}
            </div>

            <div className="col-span-1 flex justify-end gap-2">
              {r.status === "failed" ? (
                <form action={requeueRecipient}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    className="rounded-xl border px-2 py-1 text-xs font-semibold hover:bg-black/5"
                    title="Retry (failed → queued)"
                  >
                    Retry
                  </button>
                </form>
              ) : null}

              {r.error ? (
                <form action={clearRecipientError}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    className="rounded-xl border px-2 py-1 text-xs font-semibold hover:bg-black/5"
                    title="Clear error"
                  >
                    Clear
                  </button>
                </form>
              ) : null}

              <form action={deleteRecipient}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  className="rounded-xl border px-2 py-1 text-xs font-semibold hover:bg-black/5"
                  title="Delete log row"
                >
                  Del
                </button>
              </form>
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#202030]/60">
            No log activity matches your filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}
