"use client";

import * as React from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * Shows datetime-local, but ALSO submits a UTC ISO string.
 * Server reads "sendAt" (ISO). "sendAtLocal" is just for display/debug.
 */
export default function DateTimeLocalIsoField({
  label = "Send at (local time)",
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

  React.useEffect(() => {
    const d = new Date(Date.now() + defaultMinutesFromNow * 60_000);
    setLocal(toLocalInputValue(d));
  }, [defaultMinutesFromNow]);

  const iso = React.useMemo(() => {
    if (!local) return "";
    const d = new Date(local); // browser treats as LOCAL time ✅
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString(); // convert to UTC ISO ✅
  }, [local]);

  return (
    <div className="grid gap-1">
      <label className="text-xs font-semibold text-[#202030]/70">{label}</label>

      <input
        type="datetime-local"
        name={localName}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="rounded-2xl border px-3 py-2 text-sm"
        required={required}
      />

      {/* what the server action should read */}
      <input type="hidden" name={isoName} value={iso} />

      <p className="text-[11px] text-[#202030]/60">
        (auto-fills {defaultMinutesFromNow} min ahead)
      </p>
    </div>
  );
}
