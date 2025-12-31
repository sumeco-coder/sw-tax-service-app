"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { requestAppointment, type AppointmentState } from "../actions";

const initialState: AppointmentState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background:
          "var(--brand-gradient, linear-gradient(90deg, #E00040, #B04020))",
      }}
    >
      {pending ? "Booking…" : "Request appointment"}
    </button>
  );
}

function formatSlotLabel(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);
}

export default function AppointmentForm() {
  const [state, formAction] = useFormState(requestAppointment, initialState);

  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slots, setSlots] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const res = await fetch("/api/public/appointments/slots", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to load slots.");

        const list = Array.isArray(data?.slots) ? (data.slots as string[]) : [];
        if (!cancelled) {
          setSlots(list);
          setStartsAt(list[0] ?? "");
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
          setStartsAt("");
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, []);

  const canShowSlots = !loadingSlots && slots.length > 0;

  return (
    <form action={formAction} className="grid gap-5">
      {/* Status */}
      {state.message ? (
        <div
          role="status"
          aria-live="polite"
          className={[
            "rounded-2xl border p-4 text-sm shadow-sm",
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <span
              className={[
                "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                state.ok ? "bg-emerald-100" : "bg-rose-100",
              ].join(" ")}
            >
              {state.ok ? "✓" : "!"}
            </span>
            <div>
              <div className="font-semibold">
                {state.ok ? "Request received" : "Fix this to continue"}
              </div>
              <div className="mt-0.5 opacity-90">{state.message}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Card */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <div className="text-sm font-semibold text-foreground">
            Request an appointment
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a time and we’ll confirm by email (and SMS if you add your phone).
          </p>
        </div>

        <div className="grid gap-4">
          {/* Name */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Full name
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.8 0 5-2.2 5-5s-2.2-5-5-5-5 2.2-5 5 2.2 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
                </svg>
              </span>
              <input
                name="name"
                required
                placeholder="Jane Doe"
                className="w-full rounded-xl border bg-background px-10 py-3 text-sm text-foreground outline-none transition
                           focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 13l-12-8h24l-12 8zm-12-6l12 8 12-8v11h-24v-11z" />
                  </svg>
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="jane@example.com"
                  className="w-full rounded-xl border bg-background px-10 py-3 text-sm text-foreground outline-none transition
                             focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Phone <span className="font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.6 10.8c1.2 2.4 3.2 4.4 5.6 5.6l2-2c.3-.3.8-.4 1.2-.2 1 .4 2.1.6 3.2.6.6 0 1 .4 1 1v3.1c0 .6-.4 1-1 1C9.4 20 4 14.6 4 8.4c0-.6.4-1 1-1H8c.6 0 1 .4 1 1 0 1.1.2 2.2.6 3.2.2.4.1.9-.2 1.2l-1.8 2z" />
                  </svg>
                </span>
                <input
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(555) 555-5555"
                  className="w-full rounded-xl border bg-background px-10 py-3 text-sm text-foreground outline-none transition
                             focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Slots (ISO with timezone) */}
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Preferred time
            </label>

            <select
              name="startsAt"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              disabled={loadingSlots || slots.length === 0}
              className="w-full rounded-xl border bg-background px-3 py-3 text-sm text-foreground outline-none transition
                         focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-60"
            >
              {loadingSlots ? (
                <option value="">Loading available times…</option>
              ) : slots.length === 0 ? (
                <option value="">No times available right now</option>
              ) : (
                slots.map((s) => (
                  <option key={s} value={s}>
                    {formatSlotLabel(s)}
                  </option>
                ))
              )}
            </select>

            <p className="text-[11px] text-muted-foreground">
              {canShowSlots
                ? "These times are live availability."
                : "If nothing shows, refresh or try again later."}
            </p>
          </div>

          {/* Submit */}
          <div className="pt-1">
            <SubmitButton />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              By submitting, you agree to receive appointment updates. No spam.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
