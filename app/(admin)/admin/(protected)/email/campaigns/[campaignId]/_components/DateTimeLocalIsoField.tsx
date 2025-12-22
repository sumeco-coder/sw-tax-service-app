"use client";

import * as React from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateTimeLocalValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * Shows a datetime-local picker, but submits a UTC ISO string in a hidden input.
 * Server should read: formData.get(isoName)
 */
export default function DateTimeLocalIsoField({
  label = "Send at (your local time)",
  localName = "sendAtLocal",
  isoName = "sendAt",
  defaultMinutesFromNow = 5,
  required = true,
}: {
  label?: string;
  localName?: string;
  isoName?: string;
  defaultMinutesFromNow?: number;
  required?: boolean;
}) {
  const [local, setLocal] = React.useState("");

  // default to 5 minutes ahead
  React.useEffect(() => {
    const d = new Date(Date.now() + defaultMinutesFromNow * 60_000);
    setLocal(toDateTimeLocalValue(d));
  }, [defaultMinutesFromNow]);

  // Convert local -> ISO (UTC)
  const iso = React.useMemo(() => {
    if (!local) return "";
    const d = new Date(local); // browser interprets as local time
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }, [local]);

  return (
    <div className="flex-1">
      <label className="text-xs font-semibold text-[#202030]/70">{label}</label>

      {/* Visible local picker */}
      <input
        type="datetime-local"
        name={localName}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="mt-1 w-full rounded-2xl border px-3 py-2 text-sm"
        required={required}
      />

      {/* Hidden ISO string that the server uses */}
      <input type="hidden" name={isoName} value={iso} />

      <p className="mt-1 text-[11px] text-[#202030]/60">
        Tip: pick at least 2–5 minutes ahead.
      </p>
    </div>
  );
}
