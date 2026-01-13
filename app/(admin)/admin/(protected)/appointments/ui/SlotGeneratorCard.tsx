"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data;
}

type Props = {
  disabled?: boolean;
  onCreated?: () => void;
};

const DOW = [
  { n: 0, label: "Sun" },
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
];

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default function SlotGeneratorCard({ disabled, onCreated }: Props) {
  const [pending, start] = useTransition();
  const busy = !!disabled || pending;

  const today = useMemo(() => ymdLocal(new Date()), []);
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(addDaysYmd(today, 14));

  const [startHour, setStartHour] = useState<number>(9);
  const [endHour, setEndHour] = useState<number>(17);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(30);

  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [msg, setMsg] = useState<string>("");

  const toggleDow = (n: number) => {
    setDaysOfWeek((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort()));
  };

  const quickGenerate = () =>
    start(async () => {
      setMsg("");
      try {
        // ✅ POST {} triggers default generator in your API
        const data = await jsonFetch("/api/admin/appointment-slots", {
          method: "POST",
          body: JSON.stringify({}),
        });
        setMsg(`Created ${data?.inserted ?? "slots"} slots.`);
        onCreated?.();
      } catch (e: any) {
        setMsg(e?.message ?? "Failed to generate slots");
      }
    });

  const customGenerate = () =>
    start(async () => {
      setMsg("");
      try {
        const payload = {
          startDate,
          endDate,
          startHour,
          endHour,
          intervalMinutes,
          daysOfWeek,
        };

        const data = await jsonFetch("/api/admin/appointment-slots", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setMsg(`Created ${data?.inserted ?? 0} slots.`);
        onCreated?.();
      } catch (e: any) {
        setMsg(e?.message ?? "Failed to generate slots");
      }
    });

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Generate Open Slots</CardTitle>
        <CardDescription>
          This creates future <span className="font-semibold">OPEN</span> rows in <code>appointment_slots</code>.
          Your public appointment page will only show times if slots exist.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button className="rounded-xl" disabled={busy} onClick={quickGenerate}>
            Generate next 14 days (Mon–Fri, 9–5, 30m)
          </Button>

          <div className="text-xs text-muted-foreground">
            Tip: Use this once, then manage in the Slots table below.
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm font-semibold">Custom generator</div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <div className="text-xs text-muted-foreground">Start date</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
            </div>

            <div className="grid gap-1.5">
              <div className="text-xs text-muted-foreground">End date</div>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
            </div>

            <div className="grid gap-1.5">
              <div className="text-xs text-muted-foreground">Start hour (0–23)</div>
              <Input
                type="number"
                value={startHour}
                min={0}
                max={23}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="rounded-xl"
              />
            </div>

            <div className="grid gap-1.5">
              <div className="text-xs text-muted-foreground">End hour (0–23)</div>
              <Input
                type="number"
                value={endHour}
                min={1}
                max={24}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="rounded-xl"
              />
            </div>

            <div className="grid gap-1.5">
              <div className="text-xs text-muted-foreground">Interval minutes</div>
              <Input
                type="number"
                value={intervalMinutes}
                min={10}
                max={120}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="rounded-xl"
              />
            </div>

            <div className="grid gap-1.5">
              <div className="text-xs text-muted-foreground">Days of week</div>
              <div className="flex flex-wrap gap-2">
                {DOW.map((d) => (
                  <button
                    key={d.n}
                    type="button"
                    onClick={() => toggleDow(d.n)}
                    disabled={busy}
                    className={[
                      "rounded-xl border px-3 py-2 text-xs font-semibold",
                      daysOfWeek.includes(d.n) ? "bg-primary text-primary-foreground border-primary" : "bg-background",
                    ].join(" ")}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" disabled={busy} onClick={customGenerate}>
              Generate custom slots
            </Button>
            <div className="text-xs text-muted-foreground">{busy ? "Working…" : ""}</div>
          </div>
        </div>

        {msg ? <div className="text-sm text-muted-foreground">{msg}</div> : null}
      </CardContent>
    </Card>
  );
}
