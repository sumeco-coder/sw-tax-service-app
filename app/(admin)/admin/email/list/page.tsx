import { db } from "@/drizzle/db";
import { emailSubscribers } from "@/drizzle/schema";
import { desc } from "drizzle-orm";
import {
  addSubscriber,
  deleteSubscriber,
  resubscribeSubscriber,
  unsubscribeSubscriber,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmailListPage() {
  const rows = await db
    .select()
    .from(emailSubscribers)
    .orderBy(desc(emailSubscribers.createdAt))
    .limit(500);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#202030]">Email List</h1>
          <p className="text-sm text-[#202030]/70">
            Manually add subscribers and manage status.
          </p>
        </div>
      </div>

      {/* Add form */}
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#202030]">Add subscriber</h2>

        <form action={addSubscriber} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
            required
          />
          <input
            name="fullName"
            type="text"
            placeholder="Full name (optional)"
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
          />
          <input
            name="tags"
            type="text"
            placeholder="tags (comma separated)"
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
          />

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              style={{
                background:
                  "linear-gradient(90deg, #E00040, #B04020)",
              }}
            >
              Add / Update subscriber
            </button>
          </div>
        </form>
      </section>

      {/* List */}
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="grid grid-cols-12 bg-black/[0.02] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
          <div className="col-span-4">Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Actions</div>
        </div>

        <div className="divide-y">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 items-center px-5 py-3 text-sm">
              <div className="col-span-4 font-medium text-[#202030]">
                {r.fullName ?? "—"}
                {r.tags ? (
                  <div className="mt-1 text-xs text-[#202030]/60">
                    {r.tags}
                  </div>
                ) : null}
              </div>

              <div className="col-span-4 text-[#202030]/80">{r.email}</div>

              <div className="col-span-2">
                <span
                  className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold"
                  style={{
                    borderColor: r.status === "subscribed" ? "#22c55e40" : "#ef444440",
                    background: r.status === "subscribed" ? "#22c55e14" : "#ef444414",
                    color: r.status === "subscribed" ? "#166534" : "#991b1b",
                  }}
                >
                  {r.status}
                </span>
              </div>

              <div className="col-span-2 flex flex-wrap gap-2">
                {r.status === "subscribed" ? (
                  <form action={async () => unsubscribeSubscriber(r.id)}>
                    <button className="rounded-2xl border px-3 py-1.5 text-xs font-semibold hover:bg-black/5">
                      Unsubscribe
                    </button>
                  </form>
                ) : (
                  <form action={async () => resubscribeSubscriber(r.id)}>
                    <button className="rounded-2xl border px-3 py-1.5 text-xs font-semibold hover:bg-black/5">
                      Resubscribe
                    </button>
                  </form>
                )}

                <form action={async () => deleteSubscriber(r.id)}>
                  <button className="rounded-2xl border px-3 py-1.5 text-xs font-semibold hover:bg-black/5">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#202030]/60">
              No subscribers yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
