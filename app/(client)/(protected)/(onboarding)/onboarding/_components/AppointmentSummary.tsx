// app/onboarding/_components/AppointmentSummary.tsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

configureAmplify();

type Appointment = {
  id: string;
  startsAt: string; // ISO string from API
  status: "scheduled" | "completed" | "cancelled" | "no_show";
};

export default function AppointmentSummary() {
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        const sub = u.userId;

        const res = await fetch(
          `/api/onboarding/appointment?sub=${encodeURIComponent(sub)}`
        );
        const data = await res.json();

        if (data.appointment) {
          setAppt({
            id: data.appointment.id,
            startsAt: data.appointment.startsAt,
            status: data.appointment.status,
          });
        }
      } catch (err) {
        console.error("Error loading appointment summary:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;

  // No appointment at all
  if (!appt) {
    return (
      <p className="mt-1 text-xs text-slate-500">
        You haven&apos;t scheduled your review call yet. You can do this in
        Step 4.
      </p>
    );
  }

  const formattedDate = new Date(appt.startsAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // If you only care about future scheduled appts:
  if (appt.status === "scheduled") {
    return (
      <p className="mt-1 text-xs text-slate-600">
        Your next appointment:{" "}
        <span className="font-semibold">{formattedDate}</span>. You can
        reschedule on the{" "}
        <a href="/onboarding/schedule" className="text-blue-600 underline">
          scheduling step
        </a>
        .
      </p>
    );
  }

  // For cancelled / completed / no_show you can tweak the copy as you like
  if (appt.status === "cancelled") {
    return (
      <p className="mt-1 text-xs text-slate-500">
        Your last appointment on{" "}
        <span className="font-semibold">{formattedDate}</span> was cancelled.
        You can book a new time in Step 4 on the{" "}
        <a href="/onboarding/schedule" className="text-blue-600 underline">
          scheduling step
        </a>
        .
      </p>
    );
  }

  // completed / no_show fallback
  return (
    <p className="mt-1 text-xs text-slate-500">
      Your last appointment was on{" "}
      <span className="font-semibold">{formattedDate}</span>. If you need to
      schedule another review, you can do this in Step 4 on the{" "}
      <a href="/onboarding/schedule" className="text-blue-600 underline">
        scheduling step
      </a>
      .
    </p>
  );
}
