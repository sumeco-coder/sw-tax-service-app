// app/(admin)/admin/settings/page.tsx
import { db } from "@/drizzle/db";
import { appSettings } from "@/drizzle/schema";
import { desc } from "drizzle-orm";
import SettingValueEditor from "./_components/SettingValueEditor";
import WaitlistScheduleForm from "./_components/WaitlistScheduleForm";
import { getWaitlistConfig } from "@/lib/waitlist/config";
import {
  toggleWaitlistOpenAction,
  setWaitlistModeAction,
  resetAppSettingsAction,
  upsertAppSettingAction,
  deleteAppSettingAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PROTECTED_KEYS = new Set([
  "waitlistOpen",
  "waitlistMode",
  "waitlistOpenAtUtc",
  "waitlistCloseAtUtc",
]);

export default async function AdminSettingsPage() {
  const cfg = await getWaitlistConfig();
  const appOrigin = process.env.APP_ORIGIN ?? null;
  const appUrl = process.env.APP_URL ?? null;

  const settings = await db
    .select()
    .from(appSettings)
    .orderBy(desc(appSettings.updatedAt));

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-sm text-gray-600">
          Manage platform configuration (waitlist, onboarding, feature flags).
        </p>
      </header>

      {/* WAITLIST SETTINGS */}
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Waitlist</h2>
            <p className="mt-1 text-xs text-gray-600">
              OPEN + Instant = new signups get invite email automatically. Bulk
              = you send invites manually from /admin/waitlist.
            </p>

            <p className="mt-2 text-xs">
              Status:{" "}
              <span
                className={`font-semibold ${cfg.open ? "text-emerald-700" : "text-rose-700"}`}
              >
                {cfg.open ? "OPEN" : "CLOSED"}
              </span>
              {" • "}
              Manual:{" "}
              <span className="font-semibold">
                {cfg.manualOpen ? "OPEN" : "CLOSED"}
              </span>
              {" • "}
              Schedule:{" "}
              <span className="font-semibold">
                {cfg.scheduleOpen ? "ACTIVE" : "INACTIVE"}
              </span>
              {" • "}
              Mode:{" "}
              <span className="font-semibold">{cfg.mode.toUpperCase()}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <form action={toggleWaitlistOpenAction}>
              <button
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white ${
                  cfg.manualOpen
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {cfg.manualOpen ? "Manual: Close" : "Manual: Open"}
              </button>
            </form>

            <form action={setWaitlistModeAction} className="flex gap-2">
              <button
                name="mode"
                value="instant"
                className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                  cfg.mode === "instant"
                    ? "bg-gray-900 text-white"
                    : "border bg-white hover:bg-gray-50"
                }`}
              >
                Instant
              </button>
              <button
                name="mode"
                value="bulk"
                className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                  cfg.mode === "bulk"
                    ? "bg-gray-900 text-white"
                    : "border bg-white hover:bg-gray-50"
                }`}
              >
                Bulk
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* WAITLIST SCHEDULE */}
      <WaitlistScheduleForm
        openAtUtcIso={cfg.openAtUtc?.toISOString() ?? null}
        closeAtUtcIso={cfg.closeAtUtc?.toISOString() ?? null}
      />

      {/* EMAIL / APP URL (read-only) */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Email Links</h2>
        <p className="mt-1 text-xs text-gray-600">
          Emails should use <code>APP_ORIGIN</code> (preferred) or{" "}
          <code>APP_URL</code> (fallback) so invite links are always correct.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-gray-50 p-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">
                APP_ORIGIN (preferred)
              </span>
              <span className="font-mono text-xs text-gray-900">
                {appOrigin ?? "(not set)"}
              </span>
            </div>
          </div>

          <div className="rounded-lg border bg-gray-50 p-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">APP_URL (fallback)</span>
              <span className="font-mono text-xs text-gray-900">
                {appUrl ?? "(not set)"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ INLINE EDITOR + ADD NEW */}
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-gray-900">
            Settings Editor
          </h2>
          <p className="text-xs text-gray-600">
            Edit values inline. Keys are fixed (primary key). Add new keys
            below.
          </p>
        </div>

        {/* Add new */}
        <div className="mt-4 rounded-xl border bg-gray-50 p-3">
          <h3 className="text-xs font-semibold text-gray-900">
            Add new setting
          </h3>
          <form
            action={upsertAppSettingAction}
            className="mt-2 flex flex-col gap-2 sm:flex-row"
          >
            <input
              name="key"
              placeholder="featureFlagName"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
            <input
              name="value"
              placeholder="true / false / any string"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black">
              Add / Save
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {settings.map((s) => {
                const updated =
                  s.updatedAt instanceof Date
                    ? s.updatedAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : new Date(s.updatedAt as any).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      });

                const isProtected = PROTECTED_KEYS.has(s.key);

                return (
                  <tr key={s.key} className="align-top">
                    <td className="px-4 py-3 font-mono text-xs text-gray-900">
                      {s.key}
                    </td>

                    <td className="px-4 py-3">
                      <form
                        action={upsertAppSettingAction}
                        className="flex items-start gap-2"
                      >
                        <input type="hidden" name="key" value={s.key} />

                        <div className="w-full">
                          <SettingValueEditor
                            settingKey={s.key}
                            defaultValue={s.value}
                          />
                        </div>

                        <button className="h-10 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-black">
                          Save
                        </button>
                      </form>
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-500">
                      {updated}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <form action={deleteAppSettingAction}>
                          <input type="hidden" name="key" value={s.key} />
                          <button
                            type="submit"
                            disabled={isProtected}
                            className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              isProtected
                                ? "Protected key (don’t delete). You can edit the value."
                                : "Delete this setting"
                            }
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {settings.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm text-gray-500"
                    colSpan={4}
                  >
                    No settings found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* DANGER ZONE */}
      <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h2 className="text-sm font-semibold text-rose-900">Danger Zone</h2>
        <p className="mt-1 text-xs text-rose-800">
          Reset waitlist settings back to defaults (does not remove custom
          keys).
        </p>

        <form action={resetAppSettingsAction} className="mt-3">
          <button
            type="submit"
            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Reset Waitlist Settings
          </button>
        </form>
      </section>
    </main>
  );
}
