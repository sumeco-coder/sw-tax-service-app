// app/(client)/onboarding/schedule/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import Link from "next/link";
import { cancelAppointment, rescheduleAppointment, bookAppointment } from "./actions";

configureAmplify();

type UserIdentity = {
  sub: string;
  email: string;
};

type Appointment = {
  id: string;
  startsAt: string; // ISO string
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Fake available dates (next 10 days)
const getNext10Days = () => {
  const out: Date[] = [];
  const now = new Date();
  for (let i = 1; i <= 10; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    out.push(d);
  }
  return out;
};

// Time slots with label + 24h value
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
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export default function SchedulePage() {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);

  const [isRescheduling, setIsRescheduling] = useState(false);

  const dates = useMemo(() => getNext10Days(), []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<(typeof TIME_SLOTS)[number] | null>(null);

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

  const DateGrid = (
    <section>
      <p className="text-sm font-semibold text-slate-800 mb-2">Choose a date</p>

      <div className="grid grid-cols-5 gap-3 sm:grid-cols-7">
        {dates.map((date) => {
          const day = days[date.getDay()];
          const isSelected =
            selectedDate && date.toDateString() === selectedDate.toDateString();

          const month = date.toLocaleDateString("en-US", { month: "short" });
          const dayNum = date.toLocaleDateString("en-US", { day: "numeric" });
          const year = date.toLocaleDateString("en-US", { year: "numeric" });

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => {
                setSelectedDate(date);
                setSelectedSlot(null);
              }}
              className={`rounded-xl p-3 text-center shadow-sm border transition leading-tight
                ${isSelected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
            >
              <p
                className={`text-[11px] font-semibold opacity-80 ${
                  isSelected ? "text-blue-700" : "text-slate-700"
                }`}
              >
                {day}
              </p>

              <p
                className={`mt-1 text-base font-extrabold ${
                  isSelected ? "text-blue-700" : "text-slate-900"
                }`}
              >
                {month} {dayNum}
              </p>

              <p className="text-[11px] font-semibold text-slate-500">{year}</p>
            </button>
          );
        })}
      </div>
    </section>
  );

  const TimeSlots = selectedDate && (
    <section>
      <p className="text-sm font-semibold text-slate-800 mb-2">Available times</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TIME_SLOTS.map((slot) => {
          const isSelected = selectedSlot?.value === slot.value;
          return (
            <button
              key={slot.value}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`rounded-lg px-4 py-2 text-sm shadow-sm border transition
                ${isSelected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white hover:bg-slate-100"}`}
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
            Step 4 of 4
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Schedule your review call
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pick a time for your tax professional to go over your return and next steps.
          </p>
        </header>

        {loadingAppointment && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Loading your current appointment…
          </div>
        )}

        {/* IF NO APPOINTMENT YET → BOOK NEW */}
        {!currentAppointment && (
          <form action={bookAppointment} className="space-y-6">
            <input type="hidden" name="cognitoSub" value={user.sub} />
            <input type="hidden" name="email" value={user.email} />
            <input type="hidden" name="scheduledAt" value={scheduledAtIso} />

            {DateGrid}
            {TimeSlots}

            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm
                  ${canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"}`}
              >
                Confirm appointment
              </button>

              <Link
                href="/onboarding"
                className="mt-3 block text-center text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Back to onboarding
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
                    className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    Cancel appointment
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setIsRescheduling((v) => !v)}
                  className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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

                {DateGrid}
                {TimeSlots}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm
                      ${canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"}`}
                  >
                    Confirm new time
                  </button>

                  <Link
                    href="/onboarding"
                    className="mt-3 block text-center text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Back to onboarding
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
