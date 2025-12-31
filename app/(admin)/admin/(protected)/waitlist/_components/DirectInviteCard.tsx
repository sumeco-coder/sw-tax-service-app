"use client";

import { useState, useTransition } from "react";
import { sendDirectInviteAction } from "../actions";

export default function DirectInviteCard() {
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Direct Invite</h2>
      <p className="mt-1 text-xs text-gray-600">
        Send an onboarding link to any email (no waitlist required).
      </p>

      <form
        action={(fd) => {
          setMsg(null);
          startTransition(async () => {
            try {
              await sendDirectInviteAction(fd);
              setMsg("✅ Invite sent.");
            } catch (e: any) {
              setMsg(`❌ ${e?.message ?? "Failed to send invite."}`);
            }
          });
        }}
        className="mt-3 grid gap-2 sm:grid-cols-4"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="client@email.com"
          className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
        />
        <input
          name="fullName"
          placeholder="Full name (optional)"
          className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
        />

        <select
          name="inviteType"
          className="rounded-lg border px-3 py-2 text-sm sm:col-span-1"
          defaultValue="taxpayer"
        >
          <option value="taxpayer">Taxpayer</option>
          <option value="lms-preparer">LMS Preparer</option>
        </select>

        <input
          name="plan"
          placeholder="plan (optional)"
          className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
        />

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-60 sm:col-span-1"
        >
          {isPending ? "Sending..." : "Send Invite"}
        </button>
      </form>

      {msg ? <p className="mt-3 text-xs text-gray-700">{msg}</p> : null}
    </section>
  );
}
