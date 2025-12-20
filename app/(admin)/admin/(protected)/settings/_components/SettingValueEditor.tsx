"use client";

import { useMemo, useState } from "react";

function isBoolString(v: string) {
  return v === "true" || v === "false";
}

function isUtcDateKey(key: string) {
  // keys that store UTC ISO timestamps
  return key.toLowerCase().endsWith("atutc") || key.endsWith("AtUtc");
}

function toDateTimeLocalValue(iso: string) {
  // iso -> "YYYY-MM-DDTHH:mm" in local time
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

type Props = {
  settingKey: string;
  defaultValue: string;
};

export default function SettingValueEditor({ settingKey, defaultValue }: Props) {
  const kind = useMemo(() => {
    if (settingKey === "waitlistMode") return "mode";
    if (isUtcDateKey(settingKey)) return "datetimeUtc";
    if (isBoolString(defaultValue)) return "boolean";
    return "text";
  }, [settingKey, defaultValue]);

  // This is the value that will be submitted (via hidden input name="value")
  const [value, setValue] = useState<string>(defaultValue ?? "");

  // For datetime input display (local)
  const [localDateTime, setLocalDateTime] = useState<string>(() => {
    if (kind !== "datetimeUtc") return "";
    return defaultValue ? toDateTimeLocalValue(defaultValue) : "";
  });

  if (kind === "boolean") {
    const checked = value === "true";

    return (
      <div className="flex items-center gap-3">
        <input type="hidden" name="value" value={checked ? "true" : "false"} />

        <button
          type="button"
          onClick={() => setValue(checked ? "false" : "true")}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            checked ? "bg-emerald-600" : "bg-gray-300"
          }`}
          aria-label="Toggle boolean"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
              checked ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>

        <span className="font-mono text-xs text-gray-700">
          {checked ? "true" : "false"}
        </span>
      </div>
    );
  }

  if (kind === "mode") {
    return (
      <div className="flex items-center gap-2">
        <input type="hidden" name="value" value={value} />

        <select
          value={value || "instant"}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="instant">instant</option>
          <option value="bulk">bulk</option>
        </select>
      </div>
    );
  }

  if (kind === "datetimeUtc") {
    return (
      <div className="flex w-full flex-col gap-1">
        <input type="hidden" name="value" value={value} />

        <input
          type="datetime-local"
          value={localDateTime}
          onChange={(e) => {
            const v = e.target.value;
            setLocalDateTime(v);

            if (!v) {
              setValue(""); // store empty when cleared
              return;
            }

            // "YYYY-MM-DDTHH:mm" interpreted as local time -> convert to UTC ISO
            const iso = new Date(v).toISOString();
            setValue(iso);
          }}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        <div className="text-[11px] text-gray-500">
          Stored as UTC ISO:{" "}
          <span className="font-mono break-all">{value || "(empty)"}</span>
        </div>
      </div>
    );
  }

  // default text
  return (
    <div className="w-full">
      <input
        name="value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
      />
    </div>
  );
}
