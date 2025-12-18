"use client";

import * as React from "react";
import { subscribeToNewsletter } from "@/app/(site)/subscribe/actions";

type State = { ok: boolean; message: string };
const initialState: State = { ok: false, message: "" };

function SubscribeButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto rounded-full px-8 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
      style={{ background: "var(--brand-gradient)" }}
    >
      {pending ? "Subscribing..." : "Subscribe"}
    </button>
  );
}

export function SubscribeSection() {
  // ✅ useActionState returns: [state, formAction, isPending]
  const [state, formAction, isPending] = React.useActionState(
    subscribeToNewsletter,
    initialState
  );

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-8 md:p-10">
          {/* subtle accents */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--brand-gradient)" }}
          />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />

          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Stay Updated
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Join our mailing list for tax tips, IRS updates, deadlines, and offers.
            </p>

            <form
              action={formAction}
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                className="w-full flex-1 rounded-full border bg-background px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <SubscribeButton pending={isPending} />
            </form>

            {state.message ? (
              <p className={`mt-3 text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>
                {state.message}
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No spam. Unsubscribe anytime.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
