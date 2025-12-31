import type { Metadata } from "next";
import AppointmentForm from "./_components/AppointmentForm";

export const metadata: Metadata = {
  title: "Book an Appointment | SW Tax Service",
  description: "Request a time to talk. We’ll confirm by email (and SMS if you add a phone number).",
};

export default function AppointmentPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden px-6 py-16">
        {/* soft brand glows */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-[26rem] w-[70rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-[-3rem] h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative mx-auto max-w-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="text-muted-foreground">SW Tax Service</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-primary">Appointment Request</span>
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Book a time to talk
              <span
                className="block bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--brand-gradient)" }}
              >
                fast, secure, and professional.
              </span>
            </h1>

            <p className="mt-3 text-sm text-muted-foreground">
              Pick a preferred date/time and we’ll confirm by email (and SMS if you add a phone number).
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur sm:p-8">
            <AppointmentForm />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              No spam. This is only for appointment confirmations and updates.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
