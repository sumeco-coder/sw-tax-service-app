import { db } from "@/drizzle/db";
import { socialPosts } from "@/drizzle/schema";
import { desc } from "drizzle-orm";

import ScheduleInputs from "./_components/ScheduleInputs";
import {
  cancelSocialPostAction,
  createSocialPostAction,
  deleteSocialPostAction,
  requeueSocialPostAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmt(d: any) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function AdminSocialPage() {
  const posts = await db
    .select()
    .from(socialPosts)
    .orderBy(desc(socialPosts.createdAt))
    .limit(50);

  const counts = posts.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Social Scheduler</h1>
        <p className="text-sm text-gray-600">
          Compose posts and queue/schedule them. (Sending runner comes next.)
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {["queued", "sending", "sent", "failed", "canceled"].map((s) => (
            <span key={s} className="rounded-full border bg-white px-3 py-1 text-gray-700">
              {s}: <span className="font-semibold">{counts[s] ?? 0}</span>
            </span>
          ))}
        </div>
      </header>

      {/* Composer */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create a post</h2>

        <form action={createSocialPostAction} className="mt-4 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-gray-600">
              Platform
              <select name="provider" className="rounded-lg border px-3 py-2 text-sm">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="x">X (Twitter)</option>
              </select>
            </label>

            <label className="grid gap-1 text-xs text-gray-600">
              Trigger key (optional)
              <input
                name="triggerKey"
                defaultValue="manual"
                className="rounded-lg border px-3 py-2 text-sm font-mono"
                placeholder="waitlist.opened"
              />
            </label>
          </div>

          <label className="grid gap-1 text-xs text-gray-600">
            Post text
            <textarea
              name="textBody"
              required
              rows={5}
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Waitlist is OPEN ✅ Sign up now…"
            />
          </label>

          <label className="grid gap-1 text-xs text-gray-600">
            Media URLs (optional)
            <textarea
              name="mediaUrls"
              rows={3}
              className="rounded-lg border px-3 py-2 text-sm font-mono"
              placeholder={"https://...\nhttps://..."}
            />
          </label>

          <ScheduleInputs />

          <button className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black">
            Queue post
          </button>
        </form>
      </section>

      {/* Queue */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Queued / Recent</h2>

        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Text</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {posts.map((p) => {
                const badge =
                  p.status === "queued"
                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    : p.status === "sent"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : p.status === "failed"
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                    : "bg-gray-50 text-gray-700 ring-1 ring-gray-200";

                return (
                  <tr key={p.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.provider}</td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}>
                        {p.status}
                      </span>
                      {p.triggerKey ? (
                        <div className="mt-1 text-[11px] text-gray-500 font-mono">{p.triggerKey}</div>
                      ) : null}
                      {p.error ? (
                        <div className="mt-1 text-[11px] text-rose-700">{p.error}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-600">
                      {p.scheduledAt ? fmt(p.scheduledAt) : <span className="italic text-gray-400">now</span>}
                    </td>

                    <td className="px-4 py-3">
                      <div className="max-w-xl whitespace-pre-wrap text-gray-900">
                        {String(p.textBody).slice(0, 240)}
                        {String(p.textBody).length > 240 ? "…" : ""}
                      </div>
                      {Array.isArray(p.mediaUrls) && p.mediaUrls.length ? (
                        <div className="mt-2 text-[11px] text-gray-500">
                          Media: {p.mediaUrls.length}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(p.createdAt)}</td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={requeueSocialPostAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50">
                            Re-queue
                          </button>
                        </form>

                        <form action={cancelSocialPostAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50">
                            Cancel
                          </button>
                        </form>

                        <form action={deleteSocialPostAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No social posts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Next step: add a runner to send posts where status=queued and scheduledAt is null or due.
        </p>
      </section>
    </main>
  );
}
