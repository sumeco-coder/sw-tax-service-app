"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { requestAppointment, type AppointmentState } from "../actions";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: AppointmentState = { ok: false, message: "" };

const TZ = "America/Los_Angeles";
const slotDtf = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatSlotLabel(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return `${slotDtf.format(dt)} PT`;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-xl font-semibold text-primary-foreground shadow-md"
      style={{
        background: "var(--brand-gradient, linear-gradient(90deg, #E00040, #B04020))",
      }}
    >
      {pending ? "Booking…" : "Request appointment"}
    </Button>
  );
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
        const res = await fetch("/api/public/appointments/slots", { cache: "no-store" });
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

  const canShowSlots = useMemo(() => !loadingSlots && slots.length > 0, [loadingSlots, slots.length]);

  return (
    <form action={formAction} className="grid gap-5">
      {/* Status */}
      {state.message ? (
        <Alert
          variant={state.ok ? "default" : "destructive"}
          className="rounded-2xl"
        >
          <AlertTitle>{state.ok ? "Request received" : "Fix this to continue"}</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4">
            <div className="text-sm font-semibold">Request an appointment</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a time and we’ll confirm by email (and SMS if you add your phone).
            </p>
          </div>

          <div className="grid gap-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Full name</Label>
              <Input
                name="name"
                required
                placeholder="Jane Doe"
                className="h-11 rounded-xl"
              />
            </div>

            {/* Email + Phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="jane@example.com"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Phone <span className="font-normal">(optional)</span>
                </Label>
                <Input
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(555) 555-5555"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Slots */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Preferred time</Label>

              <Select
                value={startsAt}
                onValueChange={(v) => setStartsAt(v)}
                disabled={loadingSlots || slots.length === 0}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue
                    placeholder={
                      loadingSlots
                        ? "Loading available times…"
                        : slots.length === 0
                        ? "No times available right now"
                        : "Select a time"
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  {slots.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatSlotLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* IMPORTANT: server action reads startsAt from FormData, so include a hidden input */}
              <input type="hidden" name="startsAt" value={startsAt} />

              <p className="text-[11px] text-muted-foreground">
                {canShowSlots ? "These times are live availability (PT)." : "If nothing shows, refresh or try again later."}
              </p>
            </div>

            <Separator />

            <div className="pt-1">
              <SubmitButton />
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                By submitting, you agree to receive appointment updates. No spam.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
