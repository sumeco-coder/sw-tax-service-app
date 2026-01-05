// app/(client)/(protected)/onboarding/schedule/ScheduleClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  skipScheduling,
} from "../actions";

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

const BRAND_GRADIENT = "linear-gradient(135deg,#E62A68,#BB4E2B)";

export default function ScheduleClient({
  userEmail,
  userPhone,
  appointment,
}: {
  userEmail: string;
  userPhone: string;
  appointment: {
    id: string;
    scheduledAt: Date;
    durationMinutes: number;
  } | null;
}) {
  const router = useRouter();

  const [dtLocal, setDtLocal] = useState(
    appointment?.scheduledAt
      ? toDatetimeLocal(new Date(appointment.scheduledAt))
      : ""
  );
  const [reason, setReason] = useState("");

  // ✅ avoid hydration mismatch from server vs client locale formatting
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // IMPORTANT: server action expects ISO string
  const scheduledAtIso = useMemo(() => {
    if (!dtLocal) return "";
    const d = new Date(dtLocal);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }, [dtLocal]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header w/ Back */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Schedule (Optional)
          </h1>
          <p className="text-sm text-black/60">
            You can book now or skip and do it later. After this step you’ll go to
            Summary.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/onboarding/questions")}
          className="shrink-0 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-black/5 active:scale-[0.99] transition"
        >
          ← Back
        </button>
      </div>

      {/* If they already have an appointment */}
      {appointment && (
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="text-sm font-semibold text-black">
            Current appointment
          </div>

          <div className="mt-1 text-sm text-black/70">
            {mounted ? new Date(appointment.scheduledAt).toLocaleString() : "—"}
            {" • "}
            {appointment.durationMinutes} minutes
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <form
              action={cancelAppointment}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="appointmentId" value={appointment.id} />

              <input
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Cancel reason (optional)"
                className="w-full sm:w-64 rounded-xl border border-black/10 px-3 py-2 text-sm text-black placeholder:text-black/40"
              />

              <button
                type="submit"
                className="cursor-pointer rounded-xl border border-black/10 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 active:scale-[0.99] transition"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Book / Reschedule */}
      <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-4">
        <div className="text-sm font-semibold text-black">
          {appointment ? "Reschedule" : "Book an appointment"}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-black/60">
              Date & time
            </label>
            <input
              type="datetime-local"
              value={dtLocal}
              onChange={(e) => setDtLocal(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40"
            />
          </div>

          <div className="hidden sm:block" />
        </div>

        {/* ✅ ONE FORM ONLY (no nested forms) */}
        <form
          action={appointment ? rescheduleAppointment : bookAppointment}
          className="flex flex-wrap gap-2"
        >
          <input type="hidden" name="scheduledAt" value={scheduledAtIso} />
          <input type="hidden" name="email" value={userEmail ?? ""} />
          <input type="hidden" name="phone" value={userPhone ?? ""} />
          {appointment && (
            <input type="hidden" name="appointmentId" value={appointment.id} />
          )}

          <button
            type="submit"
            disabled={!scheduledAtIso}
            className="cursor-pointer rounded-xl px-4 py-2 text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-95 active:scale-[0.99] transition"
            style={{ background: BRAND_GRADIENT }}
          >
            {appointment ? "Save new time" : "Book"}
          </button>

          {/* ✅ Skip uses formAction (no nested form) */}
          <button
            type="submit"
            formAction={skipScheduling}
            formNoValidate
            className="cursor-pointer rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black hover:bg-black/5 active:scale-[0.99] transition"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
