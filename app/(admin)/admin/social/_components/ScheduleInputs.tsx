"use client";

import { useEffect, useState } from "react";

export default function ScheduleInputs() {
  const [tzOffsetMin, setTzOffsetMin] = useState<number>(0);

  useEffect(() => {
    setTzOffsetMin(new Date().getTimezoneOffset());
  }, []);

  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-xs text-gray-600">
        Schedule (optional)
        <input
          type="datetime-local"
          name="scheduledAtLocal"
          className="rounded-lg border px-3 py-2 text-sm"
        />
      </label>

      <input type="hidden" name="tzOffsetMin" value={tzOffsetMin} />

      <p className="text-xs text-gray-500">
        Leave blank to queue as “post now”. Scheduled times are saved in UTC.
      </p>
    </div>
  );
}
