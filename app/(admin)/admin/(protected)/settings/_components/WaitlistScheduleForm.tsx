// app/(admin)/admin/settings/_components/WaitlistScheduleForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { saveWaitlistScheduleAction, clearWaitlistScheduleAction } from "../actions";

function toDateTimeLocalValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function WaitlistScheduleForm(props: {
  openAtUtcIso?: string | null;
  closeAtUtcIso?: string | null;
}) {
  const [tzOffsetMin, setTzOffsetMin] = useState(0);

  useEffect(() => {
    setTzOffsetMin(new Date().getTimezoneOffset());
  }, []);

  const openDefault = useMemo(
    () => toDateTimeLocalValue(props.openAtUtcIso),
    [props.openAtUtcIso]
  );
  const closeDefault = useMemo(
    () => toDateTimeLocalValue(props.closeAtUtcIso),
    [props.closeAtUtcIso]
  );

  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Waitlist Schedule</h2>
      <p className="mt-1 text-xs text-gray-600">
        During this window, the waitlist is automatically OPEN (even if manual is closed).
      </p>

      <form action={saveWaitlistScheduleAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="tzOffsetMin" value={tzOffsetMin} />

        <label className="grid gap-1 text-xs text-gray-600">
          Open At
          <input
            name="openAtLocal"
            type="datetime-local"
            defaultValue={openDefault}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </label>

        <label className="grid gap-1 text-xs text-gray-600">
          Close At (optional)
          <input
            name="closeAtLocal"
            type="datetime-local"
            defaultValue={closeDefault}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </label>

        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <button className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black">
            Save Schedule
          </button>

          <button
            formAction={clearWaitlistScheduleAction}
            className="rounded-lg border bg-white px-4 py-2 text-xs font-semibold hover:bg-gray-50"
          >
            Clear Schedule
          </button>
        </div>
      </form>
    </section>
  );
}
