// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/schedule-section.tsx
import { scheduleSend, cancelSchedule } from "../actions";

export default function ScheduleSection({ campaign }: { campaign: any }) {
  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#202030]">Schedule send</h2>
          <p className="text-sm text-[#202030]/70">
            Schedules the runner. If nothing is queued, it will try to build automatically.
          </p>
        </div>

        {campaign.scheduledAt ? (
          <form action={cancelSchedule.bind(null, campaign.id)}>
            <button
              type="submit"
              className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
            >
              Cancel schedule
            </button>
          </form>
        ) : null}
      </div>

      <form
        action={scheduleSend.bind(null, campaign.id)}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="text-xs font-semibold text-[#202030]/70">Send at (local time)</label>
          <input
            type="datetime-local"
            name="sendAt"
            className="mt-1 w-full rounded-2xl border px-3 py-2 text-sm"
            required
          />
        </div>

        <button
          type="submit"
          className="rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
        >
          Schedule
        </button>
      </form>
    </section>
  );
}
