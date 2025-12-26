// app/(client)/onboarding/schedule/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import Link from "next/link";
import {
  cancelAppointment,
  rescheduleAppointment,
  bookAppointment,
  skipScheduling,
} from "./actions";

// shadcn ui
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// If you have cn helper
import { cn } from "@/lib/utils";

configureAmplify();

type UserIdentity = {
  sub: string;
  email: string;
};

type Appointment = {
  id: string;
  startsAt: string; // ISO string
};

const TIME_SLOTS = [
  { label: "9:00 AM", value: "09:00" },
  { label: "10:30 AM", value: "10:30" },
  { label: "12:00 PM", value: "12:00" },
  { label: "2:00 PM", value: "14:00" },
  { label: "3:30 PM", value: "15:30" },
  { label: "5:00 PM", value: "17:00" },
];

function buildIsoDateTime(date: Date, hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map((n) => Number(n));
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0); // local time
  return d.toISOString(); // stored as UTC
}

function formatPrettyDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default function SchedulePage() {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);

  const [isRescheduling, setIsRescheduling] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<(typeof TIME_SLOTS)[number] | null>(null);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Load user session
  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setUser({
          sub: u.userId,
          email: u.signInDetails?.loginId ?? "",
        });
      } catch (err) {
        console.error(err);
        setUserError("You must be signed in to schedule your review call.");
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  // Load current appointment (from DB) via API route
  useEffect(() => {
    (async () => {
      if (!user?.sub) return;
      setLoadingAppointment(true);
      try {
        const res = await fetch("/api/my-appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cognitoSub: user.sub }),
        });

        const json = await res.json().catch(() => ({}));
        setCurrentAppointment(json.appointment ?? null);
      } catch (e) {
        console.error("Failed to load appointment:", e);
        setCurrentAppointment(null);
      } finally {
        setLoadingAppointment(false);
      }
    })();
  }, [user?.sub]);

  const canSubmit = !!selectedDate && !!selectedSlot;
  const scheduledAtIso =
    selectedDate && selectedSlot ? buildIsoDateTime(selectedDate, selectedSlot.value) : "";

  if (loadingUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading your account…</p>
      </main>
    );
  }

  if (userError || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">
            {userError ?? "We couldn’t find your session. Please sign in again to continue."}
          </p>
          <a
            href="/sign-in"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to sign-in
          </a>
        </div>
      </main>
    );
  }

  const DatePicker = (
    <section className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">Choose a date</p>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start rounded-xl border-slate-200 bg-white text-left font-medium",
              !selectedDate && "text-slate-500"
            )}
          >
            {selectedDate ? formatPrettyDate(selectedDate) : "Pick a date…"}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              setSelectedDate(d);
              setSelectedSlot(null);
            }}
            disabled={{ before: today }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <p className="text-xs text-slate-500">
        Tip: only future dates are selectable.
      </p>
    </section>
  );

  const TimeSlots = selectedDate && (
    <section className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">Available times</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TIME_SLOTS.map((slot) => {
          const isSelected = selectedSlot?.value === slot.value;
          return (
            <button
              key={slot.value}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold shadow-sm border transition",
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
              )}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Step 4 of 4 (optional)
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Schedule your review call
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pick a time for your tax professional to go over your return and next steps.
            You can also skip this step and schedule later.
          </p>
        </header>

        {loadingAppointment && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Loading your current appointment…
          </div>
        )}

        {/* ✅ Skip scheduling (optional) */}
        <form action={skipScheduling} className="mb-4">
          <input type="hidden" name="cognitoSub" value={user.sub} />
          <button
            type="submit"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Skip for now (schedule later)
          </button>
        </form>

        {/* IF NO APPOINTMENT YET → BOOK NEW */}
        {!currentAppointment && (
          <form action={bookAppointment} className="space-y-6">
            <input type="hidden" name="cognitoSub" value={user.sub} />
            <input type="hidden" name="email" value={user.email} />
            <input type="hidden" name="scheduledAt" value={scheduledAtIso} />

            {DatePicker}
            {TimeSlots}

            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
                  canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"
                )}
              >
                Confirm appointment
              </button>

              <Link
                href="/onboarding/summary"
                className="mt-3 block text-center text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Back to summary
              </Link>
            </div>
          </form>
        )}

        {/* IF APPOINTMENT EXISTS → SHOW CARD + CANCEL / RESCHEDULE */}
        {currentAppointment && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Your current appointment</p>
              <p className="mt-1 text-xs text-slate-600">
                {new Date(currentAppointment.startsAt).toLocaleString("en-US")}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={cancelAppointment}>
                  <input type="hidden" name="appointmentId" value={currentAppointment.id} />
                  <input
                    type="hidden"
                    name="reason"
                    value="Client cancelled from onboarding portal"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    Cancel appointment
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setIsRescheduling((v) => !v)}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {isRescheduling ? "Close reschedule" : "Change time"}
                </button>
              </div>
            </div>

            {isRescheduling && (
              <form action={rescheduleAppointment} className="space-y-6">
                <input type="hidden" name="appointmentId" value={currentAppointment.id} />
                <input type="hidden" name="cognitoSub" value={user.sub} />
                <input type="hidden" name="email" value={user.email} />
                <input type="hidden" name="scheduledAt" value={scheduledAtIso} />

                {DatePicker}
                {TimeSlots}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
                      canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"
                    )}
                  >
                    Confirm new time
                  </button>

                  <Link
                    href="/onboarding/summary"
                    className="mt-3 block text-center text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Back to summary
                  </Link>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
