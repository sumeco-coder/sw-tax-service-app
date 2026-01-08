// app/(admin)/admin/(protected)/email/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients } from "@/drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";

import DateTimeLocalIsoField from "./_components/DateTimeLocalIsoField";
import SendCampaignForm from "./_components/send-campaign-form";
import { createAndSendCampaignAction } from "./actions";
import { ALL_TEMPLATES } from "./templates/_templates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = {
  primary: "#E00040",
  accent: "#B04020",
  dark: "#202030",
};

export default async function AdminEmailPage() {
  // ✅ Load DB in parallel (faster)
  const [campaignsAll, scheduled] = await Promise.all([
    db
      .select()
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.createdAt))
      .limit(25),

    db
      .select({
        id: emailCampaigns.id,
        name: emailCampaigns.name,
        subject: emailCampaigns.subject,
        status: emailCampaigns.status,
        scheduledAt: emailCampaigns.scheduledAt,
        createdAt: emailCampaigns.createdAt,
      })
      .from(emailCampaigns)
      .where(eq(emailCampaigns.status, "scheduled" as any))
      .orderBy(desc(emailCampaigns.scheduledAt))
      .limit(25),
  ]);

  // ✅ Dedupe templates by id (prevents dropdown duplicates if ALL_TEMPLATES repeats)
  const uniqueTemplates = Array.from(
    new Map((ALL_TEMPLATES ?? []).map((t) => [t.id, t])).values()
  );

  // ✅ normalize template html safely (handles html OR mjml-only templates)
const templates = uniqueTemplates.map((t) => {
  const html =
    ("html" in t && typeof (t as any).html === "string" ? (t as any).html : "") ||
    ("mjml" in t && typeof (t as any).mjml === "string" ? (t as any).mjml : "") ||
    "";

  return {
    id: t.id,
    name: t.name,
    category: "category" in t ? (t as any).category : undefined,
    subject: t.subject,
    html,
    text: (t as any).text ?? "",
  };
});

  /**
   * You do NOT have an `email_lists` table right now.
   * So keep lists empty to avoid query errors. Subscribers live at /admin/email/list.
   */
  const lists: { id: string; name: string }[] = [];

  // ✅ Optional: reduce “duplicate looking” UI by not showing scheduled campaigns twice
  const campaignsForTable = campaignsAll.filter(
    (c: any) => String(c.status) !== "scheduled"
  );

  /* =========================
     Server actions (DB-only schedule/cancel)
     ========================= */

  async function scheduleCampaignAction(formData: FormData) {
    "use server";

    const campaignId = String(formData.get("campaignId") ?? "").trim();
    if (!campaignId) throw new Error("Pick a campaign.");

    const sendAtIso = String(formData.get("sendAt") ?? "").trim(); // ISO from hidden input
    const sendAtLocal = String(formData.get("sendAtLocal") ?? "").trim(); // optional debug

    if (!sendAtIso) throw new Error("Pick a send time.");

    const sendAt = new Date(sendAtIso);
    if (Number.isNaN(sendAt.getTime())) {
      throw new Error(
        `Invalid date/time. (local="${sendAtLocal}", iso="${sendAtIso}")`
      );
    }

    // ✅ Safety: require at least 1 minute in the future
    if (sendAt.getTime() < Date.now() + 60_000) {
      throw new Error("Send time must be at least 1 minute in the future.");
    }

    // ✅ Require queued recipients
    const [q] = await db
      .select({
        queued: sql<number>`sum(case when ${emailRecipients.status} = 'queued' then 1 else 0 end)::int`,
      })
      .from(emailRecipients)
      .where(eq(emailRecipients.campaignId, campaignId));

    const queued = q?.queued ?? 0;
    if (queued <= 0) {
      throw new Error(
        "No queued recipients for this campaign. Open the campaign and add/build recipients first."
      );
    }

    // ✅ DB-only scheduling (cheapest)
    // Runner promotes scheduled_at <= now() to "sending"
    await db
      .update(emailCampaigns)
      .set({
        status: "scheduled" as any,
        scheduledAt: sendAt,
        schedulerName: null, // ✅ no AWS Scheduler in DB-only mode
        updatedAt: new Date(),
      } as any)
      .where(eq(emailCampaigns.id, campaignId));

    revalidatePath("/admin/email");
    revalidatePath(`/admin/email/campaigns/${campaignId}`);
  }

  async function cancelCampaignScheduleAction(formData: FormData) {
    "use server";

    const campaignId = String(formData.get("campaignId") ?? "").trim();
    if (!campaignId) throw new Error("Missing campaignId");

    await db
      .update(emailCampaigns)
      .set({
        status: "draft" as any,
        scheduledAt: null,
        schedulerName: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(emailCampaigns.id, campaignId));

    revalidatePath("/admin/email");
    revalidatePath(`/admin/email/campaigns/${campaignId}`);
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.dark }}>
            Email
          </h1>
          <p className="text-sm" style={{ color: `${BRAND.dark}B3` }}>
            Create campaigns, send to waitlist/manual recipients, and schedule delivery.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/email/campaigns"
            className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Campaigns
          </Link>

          <Link
            href="/admin/email/logs"
            className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Logs
          </Link>

          <Link
            href="/admin/email/list"
            className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Email List
          </Link>
        </div>
      </div>

      {/* ✅ DB-only schedule panel */}
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold" style={{ color: BRAND.dark }}>
            Schedule
          </h2>
          <p className="text-sm" style={{ color: `${BRAND.dark}B3` }}>
            Cheapest mode: this only writes <code>scheduledAt</code> to the DB.
            The runner checks every 5 minutes, so it may start sending 0–5 minutes
            after your selected time. (Recipients must already be queued.)
          </p>
        </div>

       <form
  action={scheduleCampaignAction}
  className="mt-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
>
  <label className="grid min-w-0 gap-1 text-xs font-semibold text-[#202030]/70">
    Campaign
    <select
      name="campaignId"
      className="w-full min-w-0 cursor-pointer rounded-2xl border px-3 py-2 text-sm"
      required
      defaultValue=""
    >
      <option value="" disabled>
        — Select a campaign —
      </option>
      {campaignsAll.map((c: any) => (
        <option key={String(c.id)} value={String(c.id)}>
          {String(c.name)} ({String(c.status)})
        </option>
      ))}
    </select>
  </label>

  {/* ✅ IMPORTANT: wrapper min-w-0 so the field can shrink */}
  <div className="min-w-0">
    <DateTimeLocalIsoField isoName="sendAt" localName="sendAtLocal" />
  </div>

  <button
    type="submit"
    className="w-full md:w-auto md:justify-self-end cursor-pointer h-[38px] rounded-2xl px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95"
    style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
  >
    Schedule
  </button>
</form>


        {/* Scheduled list */}
        <div className="mt-5 overflow-hidden rounded-2xl border">
          <div className="grid grid-cols-12 bg-black/[0.02] px-4 py-3 text-xs font-semibold uppercase tracking-wide">
            <div className="col-span-6" style={{ color: `${BRAND.dark}99` }}>
              Campaign
            </div>
            <div className="col-span-4" style={{ color: `${BRAND.dark}99` }}>
              Scheduled
            </div>
            <div className="col-span-2 text-right" style={{ color: `${BRAND.dark}99` }}>
              {" "}
            </div>
          </div>

          <div className="divide-y">
            {scheduled.map((c: any) => (
              <div
                key={String(c.id)}
                className="grid grid-cols-12 items-center px-4 py-3 text-sm"
              >
                <div className="col-span-6">
                  <Link
                    href={`/admin/email/campaigns/${c.id}`}
                    className="font-semibold hover:underline"
                    style={{ color: BRAND.dark }}
                  >
                    {String(c.name)}
                  </Link>
                  <div className="mt-1 text-xs" style={{ color: `${BRAND.dark}99` }}>
                    {String(c.subject)}
                  </div>
                </div>

                <div className="col-span-4 text-xs" style={{ color: `${BRAND.dark}B3` }}>
                  {c.scheduledAt ? new Date(c.scheduledAt as any).toLocaleString() : "—"}
                </div>

                <div className="col-span-2 flex justify-end">
                  <form action={cancelCampaignScheduleAction}>
                    <input type="hidden" name="campaignId" value={String(c.id)} />
                    <button
                      type="submit"
                      className="cursor-pointer rounded-xl border px-2 py-1 text-xs font-semibold hover:bg-black/5"
                      title="Cancel schedule"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            ))}

            {scheduled.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: `${BRAND.dark}99` }}>
                No scheduled campaigns yet.
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-xs" style={{ color: `${BRAND.dark}99` }}>
          Tip: Build recipients on the campaign page:
          <span className="ml-1 font-semibold">
            Campaigns → click campaign → Build recipients → Schedule
          </span>
        </p>
      </section>

      {/* Send a campaign */}
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold" style={{ color: BRAND.dark }}>
          Send a campaign
        </h2>

        <SendCampaignForm
          templates={templates}
          lists={lists}
          action={createAndSendCampaignAction}
        />

        {lists.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: `${BRAND.dark}99` }}>
            Note: “Email List” dropdown is disabled until you add an{" "}
            <code>email_lists</code> table. You can still manage subscribers at{" "}
            <Link className="font-semibold underline" href="/admin/email/list">
              /admin/email/list
            </Link>
            .
          </p>
        ) : null}
      </section>

      {/* Campaigns (quick view) */}
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="grid grid-cols-12 bg-black/[0.02] px-5 py-3 text-xs font-semibold uppercase tracking-wide">
          <div className="col-span-5" style={{ color: `${BRAND.dark}99` }}>
            Name
          </div>
          <div className="col-span-3" style={{ color: `${BRAND.dark}99` }}>
            Segment
          </div>
          <div className="col-span-2" style={{ color: `${BRAND.dark}99` }}>
            Status
          </div>
          <div className="col-span-2" style={{ color: `${BRAND.dark}99` }}>
            Created
          </div>
        </div>

        <div className="divide-y">
          {campaignsForTable.map((c: any) => (
            <div
              key={String(c.id)}
              className="grid grid-cols-12 items-center px-5 py-3 text-sm"
            >
              <div className="col-span-5">
                <Link
                  href={`/admin/email/campaigns/${c.id}`}
                  className="font-semibold hover:underline"
                  style={{ color: BRAND.dark }}
                >
                  {String(c.name)}
                </Link>
                <div className="mt-1 text-xs" style={{ color: `${BRAND.dark}99` }}>
                  {String(c.subject)}
                </div>
              </div>

              <div className="col-span-3 text-xs" style={{ color: `${BRAND.dark}B3` }}>
                {String(c.segment)}
              </div>

              <div className="col-span-2">
                <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                  {String(c.status)}
                </span>
              </div>

              <div className="col-span-2 text-xs" style={{ color: `${BRAND.dark}B3` }}>
                {new Date(c.createdAt as any).toLocaleString()}
              </div>
            </div>
          ))}

          {campaignsForTable.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: `${BRAND.dark}99` }}>
              No campaigns yet.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
