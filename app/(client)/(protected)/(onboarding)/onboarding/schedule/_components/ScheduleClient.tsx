"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  skipScheduling,
} from "../actions";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

type AppointmentProp = {
  id: string;
  scheduledAt: string; // ✅ send ISO string from server
  durationMinutes: number;
};

export default function ScheduleClient({
  userEmail,
  userPhone,
  appointment,
}: {
  userEmail: string;
  userPhone: string;
  appointment: AppointmentProp | null;
}) {
  const router = useRouter();

  const [dtLocal, setDtLocal] = useState(() => {
    if (!appointment?.scheduledAt) return "";
    return toDatetimeLocal(new Date(appointment.scheduledAt));
  });

  const [reason, setReason] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // server action expects ISO string
  const scheduledAtIso = useMemo(() => {
    if (!dtLocal) return "";
    const d = new Date(dtLocal); // datetime-local parses as local time
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }, [dtLocal]);

  const niceTime = useMemo(() => {
    if (!appointment?.scheduledAt) return "";
    const d = new Date(appointment.scheduledAt);
    return d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  }, [appointment?.scheduledAt]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Step 4</Badge>
              <Badge className="bg-primary text-primary-foreground">Optional</Badge>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Schedule your review call
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Book now or skip and schedule later. After this, you’ll go to Summary.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => router.push("/onboarding/questions")}
          >
            ← Back
          </Button>
        </div>

        {/* Current appointment */}
        {appointment && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current appointment</CardTitle>
              <CardDescription>
                {mounted ? (
                  <>
                    {niceTime} • {appointment.durationMinutes} minutes
                  </>
                ) : (
                  "—"
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <Separator />

              <form action={cancelAppointment} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input type="hidden" name="appointmentId" value={appointment.id} />

                <div className="flex-1">
                  <Label className="sr-only">Cancel reason</Label>
                  <Input
                    name="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Cancel reason (optional)"
                    className="rounded-xl"
                  />
                </div>

                <Button type="submit" variant="destructive" className="rounded-xl">
                  Cancel appointment
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Book / Reschedule */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {appointment ? "Reschedule" : "Book an appointment"}
            </CardTitle>
            <CardDescription>
              Choose a date/time. You can always change it later.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date & time</Label>
                <Input
                  type="datetime-local"
                  value={dtLocal}
                  onChange={(e) => setDtLocal(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Times are displayed in Pacific Time.
                </p>
              </div>

              <div className="hidden sm:block" />
            </div>

            {!scheduledAtIso && (
              <Alert className="rounded-xl">
                <AlertDescription className="text-sm">
                  Pick a date & time to enable booking.
                </AlertDescription>
              </Alert>
            )}

            {/* ✅ ONE FORM ONLY */}
            <form
              action={appointment ? rescheduleAppointment : bookAppointment}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input type="hidden" name="scheduledAt" value={scheduledAtIso} />
              <input type="hidden" name="email" value={userEmail ?? ""} />
              <input type="hidden" name="phone" value={userPhone ?? ""} />
              {appointment && (
                <input type="hidden" name="appointmentId" value={appointment.id} />
              )}

              <Button
                type="submit"
                disabled={!scheduledAtIso}
                className="rounded-xl bg-primary text-primary-foreground hover:opacity-90"
              >
                {appointment ? "Save new time" : "Book"}
              </Button>

              {/* ✅ Skip uses formAction (no nested form) */}
              <Button
                type="submit"
                formAction={skipScheduling}
                formNoValidate
                variant="outline"
                className="rounded-xl"
              >
                Skip for now
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          You can schedule later from your dashboard if you skip.
        </p>
      </div>
    </main>
  );
}
