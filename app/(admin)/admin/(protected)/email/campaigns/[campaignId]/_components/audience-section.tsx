// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/audience-section.tsx
import { saveAudienceOrBuild } from "../actions";

export default function AudienceSection({
  campaign,
  lists,
  appointmentAudienceValues,
}: {
  campaign: any;
  lists: any[];
  appointmentAudienceValues: string[];
}) {
  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[#202030]">Audience</h2>
        <p className="text-sm text-[#202030]/70">
          Choose sources, then <b>Build recipients</b> to queue them.
        </p>
      </div>

      <form action={saveAudienceOrBuild.bind(null, campaign.id)} className="mt-4 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-[#202030]/70">
            Segment
            <select
              name="segment"
              defaultValue={String(campaign.segment)}
              className="rounded-2xl border px-3 py-2 text-sm"
            >
              <option value="waitlist_pending">Waitlist: Pending</option>
              <option value="waitlist_approved">Waitlist: Approved</option>
              <option value="waitlist_all">Waitlist: All</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-[#202030]/70">
            Email list (optional)
            <select
              name="listId"
              defaultValue={campaign.listId ? String(campaign.listId) : ""}
              className="rounded-2xl border px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {lists.map((l: any) => (
                <option key={String(l.id)} value={String(l.id)}>
                  {String(l.name ?? l.id)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-[#202030]/70">
            Appointment audience (optional)
            <select
              name="apptSegment"
              defaultValue={campaign.apptSegment ? String(campaign.apptSegment) : ""}
              className="rounded-2xl border px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {appointmentAudienceValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-[#202030]/70">
            Manual recipients (comma/newline)
            <textarea
              name="manualRecipientsRaw"
              defaultValue={campaign.manualRecipientsRaw ?? ""}
              rows={3}
              className="rounded-2xl border px-3 py-2 text-sm"
              placeholder="a@example.com, b@example.com"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="intent"
            value="save"
            className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Save audience
          </button>

          <button
            type="submit"
            name="intent"
            value="build"
            className="rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
          >
            Build recipients (queue)
          </button>
        </div>
      </form>
    </section>
  );
}
