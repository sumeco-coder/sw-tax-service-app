// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/schedule-section.tsx
import DateTimeLocalIsoField from "./DateTimeLocalIsoField";
import { scheduleSend, cancelSchedule } from "../actions";

export default function ScheduleSection({ campaign }: { campaign: any }) {
  const scheduledAt = campaign?.scheduledAt
    ? new Date(campaign.scheduledAt)
    : null;

  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#202030]">Schedule send</h2>
          <p className="text-sm text-[#202030]/70">
            DB-only scheduling (no Lambda). This sets <code>status</code> =
            <code>scheduled</code> and <code>scheduledAt</code>. A runner is still
            needed to actually send automatically.
          </p>

          {scheduledAt ? (
            <p className="mt-2 text-xs text-[#202030]/70">
              Scheduled for:{" "}
              <span className="font-semibold">
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(scheduledAt)}
              </span>
            </p>
          ) : null}
        </div>

        {scheduledAt ? (
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
        {/* This component should output:
            - a visible datetime-local input (sendAtLocal)
            - a hidden ISO UTC value (sendAt) that the server action reads
        */}
        <div className="flex-1">
          <DateTimeLocalIsoField
            label="Send at (local time)"
            localName="sendAtLocal"
            isoName="sendAt"
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
