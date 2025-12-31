"use client";

import { useRouter } from "next/navigation";
import { cx } from "class-variance-authority";
import type { Appointment } from "@/types/dashboard";
import { fmtDateTime } from "@/lib/utils/dashboard";

type AppointmentCardProps = {
  year: number;
  nextAppt: Appointment | null;
  loading: boolean;
};

export default function AppointmentCard({
  year,
  nextAppt,
  loading,
}: AppointmentCardProps) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Upcoming Appointment
      </h3>

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading…
        </div>
      ) : !nextAppt ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            You don’t have a tax review scheduled yet.
          </p>

          <button
            onClick={() => router.push(`/onboarding/schedule?year=${year}`)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg 
                       bg-[linear-gradient(90deg,#f00067,#4a0055)] px-3 py-2 text-xs 
                       font-medium text-white shadow-sm shadow-pink-500/30 
                       hover:brightness-110 transition"
          >
            <span className="text-[14px]">📅</span>
            Schedule your tax review
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          {/* Date + Status Row */}
          <div className="flex items-center justify-between">
            <div className="font-medium text-foreground">
              {fmtDateTime(nextAppt.start)}
            </div>

            <span
              className={cx(
                "px-2 py-0.5 rounded-full text-[11px] font-medium border",
                nextAppt.status === "CONFIRMED"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : nextAppt.status === "PENDING"
                  ? "bg-amber-500/15 text-amber-200 border-amber-500/40"
                  : nextAppt.status === "RESCHEDULE_REQUESTED"
                  ? "bg-sky-500/15 text-sky-200 border-sky-500/40"
                  : "bg-background text-muted-foreground border-border"
              )}
            >
              {nextAppt.status.replace("_", " ").toLowerCase()}
            </span>
          </div>

          {/* Type + Location */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Type:</span>{" "}
              {nextAppt.type === "PHONE"
                ? "Phone call"
                : nextAppt.type === "VIDEO"
                ? "Video meeting"
                : "In-person"}
            </div>

            {nextAppt.location && (
              <div>
                <span className="font-medium text-foreground">Location:</span>{" "}
                {nextAppt.location}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => router.push(`/appointments/${nextAppt.id}`)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg 
                         border border-border bg-background px-3 py-1.5 
                         text-[11px] font-medium text-foreground hover:bg-muted transition"
            >
              View details
            </button>

            <button
              onClick={() =>
                router.push(`/appointments/${nextAppt.id}?mode=reschedule`)
              }
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg 
                         border border-border bg-background px-3 py-1.5 
                         text-[11px] font-medium text-foreground hover:bg-muted transition"
            >
              Request to reschedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
