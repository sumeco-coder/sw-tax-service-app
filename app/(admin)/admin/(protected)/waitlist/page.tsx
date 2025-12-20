// app/(admin)/waitlist/page.tsx
import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";
import { approveWaitlistAndCreateInvite, rejectWaitlist } from "./actions";
import { desc } from "drizzle-orm";
import { sendEmail } from "@/lib/email/sendEmail";

import { getWaitlistConfig } from "@/lib/waitlist/config";
import {
  toggleWaitlistOpenAction,
  setWaitlistModeAction,
  sendPendingInvitesAction,
} from "@/app/(admin)/admin/(protected)/waitlist/settings-actions";

import WaitlistScheduleForm from "./_components/WaitlistScheduleForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WaitlistRow = typeof waitlist.$inferSelect;

// Server action wrapper for form submit (Approve)
async function approveAction(formData: FormData) {
  "use server";

  const id = formData.get("id") as string | null;
  if (!id) return;

  await approveWaitlistAndCreateInvite(id);
}

// Server action wrapper for form submit (Reject)
async function rejectAction(formData: FormData) {
  "use server";

  const id = formData.get("id") as string | null;
  if (!id) return;

  await rejectWaitlist(id);
}

// Server action to send a test email
async function sendTestEmailAction(formData: FormData) {
  "use server";

  const to = (formData.get("to") as string | null)?.trim();
  if (!to) return;

  const subject = "SW Tax Service – Test Email (Waitlist Onboarding)";

  const textBody = [
    "This is a test email from SW Tax Service.",
    "",
    "If you're reading this, your email sending is working correctly 🎉",
    "",
    "Next step: approve a real waitlist entry (or use bulk send) to send a live onboarding invite.",
    "",
    "— SW Tax Service",
  ].join("\n");

  const htmlBody = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111827;">
      <p>Hi,</p>
      <p>This is a <strong>test email</strong> from <strong>SW Tax Service</strong>.</p>
      <p>If you're reading this in your inbox, your email sending pipeline is working correctly 🎉</p>
      <p style="margin-top: 16px;">
        Next step: approve a real waitlist entry from your admin dashboard (or use bulk send) to send a live onboarding invite.
      </p>
      <p style="margin-top: 16px;">— SW Tax Service</p>
    </div>
  `;

  await sendEmail({
    to,
    subject,
    htmlBody,
    textBody,
  });
}

export default async function AdminWaitlistPage() {
  let entries: WaitlistRow[] = [];
  let errorMsg: string | null = null;

  // ✅ Load config (open/closed + instant/bulk + schedule)
  const cfg = await getWaitlistConfig();

  try {
    entries = await db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
  } catch (err: any) {
    console.error("Waitlist DB error:", err);
    errorMsg = err?.message ?? "Unknown database error";
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-xl font-bold text-red-700">
            Waitlist dashboard error
          </h1>
          <p className="mb-4 text-sm text-red-600">{errorMsg}</p>
          <p className="text-xs text-gray-500">
            Check your DATABASE_URL and RDS connection if this persists.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Waitlist Dashboard
            </h1>
            <p className="text-sm text-gray-600">
              Review waitlist entries and approve clients to generate onboarding invites.
            </p>
          </div>
        </header>

        {/* ✅ WAITLIST CONTROLS */}
        <section className="rounded-xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Waitlist Controls</h2>
              <p className="mt-1 text-xs text-gray-600">
                OPEN + <b>Instant</b> = new signups get invite email automatically.
                <br />
                <b>Bulk</b> = signups stay pending until you click “Send Pending Invites”.
              </p>

              <p className="mt-2 text-xs">
                Status:{" "}
                <span
                  className={`font-semibold ${
                    cfg.open ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {cfg.open ? "OPEN" : "CLOSED"}
                </span>
                {" • "}
                Mode:{" "}
                <span className="font-semibold">{cfg.mode.toUpperCase()}</span>
                {" • "}
                Schedule:{" "}
                <span className="font-semibold">
                  {cfg.scheduleOpen ? "ACTIVE" : "INACTIVE"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Toggle open/close */}
              <form action={toggleWaitlistOpenAction}>
                <button
                  type="submit"
                  className={`rounded-lg px-4 py-2 text-xs font-semibold text-white ${
                    cfg.manualOpen
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                  title="Manual toggle (schedule can still open it automatically if active)"
                >
                  {cfg.manualOpen ? "Manual: Close" : "Manual: Open"}
                </button>
              </form>

              {/* Mode switch */}
              <form action={setWaitlistModeAction} className="flex gap-2">
                <button
                  name="mode"
                  value="instant"
                  type="submit"
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
                  type="submit"
                  className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                    cfg.mode === "bulk"
                      ? "bg-gray-900 text-white"
                      : "border bg-white hover:bg-gray-50"
                  }`}
                >
                  Bulk
                </button>
              </form>

              {/* Bulk send */}
              <form action={sendPendingInvitesAction}>
                <input type="hidden" name="limit" value="50" />
                <button
                  type="submit"
                  className="rounded-lg border bg-white px-4 py-2 text-xs font-semibold hover:bg-gray-50"
                  title="Sends invites to up to 50 pending entries"
                >
                  Send Pending Invites (50)
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ✅ SCHEDULE OPEN/CLOSE DATES */}
        <WaitlistScheduleForm
          openAtUtcIso={cfg.openAtUtc?.toISOString() ?? null}
          closeAtUtcIso={cfg.closeAtUtc?.toISOString() ?? null}
        />

        {/* 🔵 Test email sender */}
        <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-800">
          <h2 className="text-sm font-semibold text-slate-900">
            Send a test onboarding email
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Use this to confirm Resend / SES is configured correctly before approving real
            waitlist entries.
          </p>

          <form
            action={sendTestEmailAction}
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="email"
              name="to"
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Send test email
            </button>
          </form>
        </section>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            No one on the waitlist yet. Share your waitlist link to start collecting leads.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((row) => {
                  const created =
                    row.createdAt instanceof Date
                      ? row.createdAt.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : new Date(row.createdAt as any).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        });

                  const isPending = row.status === "pending";

                  return (
                    <tr key={row.id} className="align-top hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.fullName}</div>
                        {row.phone && (
                          <div className="text-xs text-gray-500">{row.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{row.email}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.plan || <span className="italic text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.roleType}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.status === "pending"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              : row.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : row.status === "rejected"
                              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                              : "bg-gray-50 text-gray-600 ring-1 ring-gray-200"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{created}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {/* Approve */}
                          <form action={approveAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button
                              type="submit"
                              disabled={!isPending}
                              className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              {isPending ? "Approve & Invite" : "Approved"}
                            </button>
                          </form>

                          {/* Reject */}
                          <form action={rejectAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button
                              type="submit"
                              disabled={!isPending}
                              className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              Reject
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Approving a waitlist entry will create an invite record, mark the entry{" "}
          <strong>approved</strong>, and send an onboarding email using{" "}
          <code>sendEmail</code>.
        </p>
      </div>
    </main>
  );
}
