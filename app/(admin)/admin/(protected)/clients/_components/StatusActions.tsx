// app/(admin)/admin/(protected)/clients/_components/StatusActions.tsx
"use client";

import * as React from "react";
import { setClientStatus } from "../actions";
import { ShieldOff, ShieldCheck, X, AlertTriangle } from "lucide-react";

type Props = {
  userId: string;
  status: "active" | "disabled";
  disabledReason?: string | null;
};

export function StatusActions({ userId, status, disabledReason }: Props) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const isDisabled = status === "disabled";

  // close on ESC
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // lock scroll when modal open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* ENABLE (no modal) */}
      {isDisabled ? (
        <form
          action={async (fd) => {
            setBusy(true);
            try {
              await setClientStatus(fd);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="status" value="active" />

          <button
            disabled={busy}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0",
              "ring-1 ring-border bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15",
              "transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
            title={disabledReason ? `Disabled: ${disabledReason}` : "Enable user"}
          >
            <ShieldCheck className="h-4 w-4" />
            {busy ? "Enabling…" : "Enable"}
          </button>
        </form>
      ) : (
        <>
          {/* DISABLE (opens modal) */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0",
              "ring-1 ring-border bg-red-500/10 text-red-700 hover:bg-red-500/15",
              "transition active:scale-[0.98]",
            ].join(" ")}
            title="Disable user access"
          >
            <ShieldOff className="h-4 w-4" />
            Disable
          </button>

          {open && (
            <div
              className="fixed inset-0 z-50"
              role="dialog"
              aria-modal="true"
              aria-label="Disable client"
            >
              {/* overlay */}
              <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setOpen(false)}
                aria-label="Close"
              />

              {/* modal */}
              <div className="relative mx-auto flex min-h-full max-w-lg items-center p-4">
                <div className="w-full overflow-hidden rounded-3xl border bg-white shadow-xl">
                  {/* header */}
                  <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
                        <AlertTriangle className="h-5 w-5 text-red-700" />
                      </div>

                      <div>
                        <div className="text-base font-black text-slate-900">
                          Disable this client?
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          They’ll be blocked from the portal until you re-enable
                          them.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* body */}
                  <div className="px-5 py-4">
                    <form
                      action={async (fd) => {
                        setBusy(true);
                        try {
                          await setClientStatus(fd);
                          setOpen(false);
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      <input type="hidden" name="userId" value={userId} />
                      <input type="hidden" name="status" value="disabled" />

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Reason (optional)
                        </label>
                        <textarea
                          name="reason"
                          rows={3}
                          placeholder="Example: identity verification needed, duplicate account, unpaid invoice…"
                          className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                        <p className="mt-2 text-[11px] text-slate-500">
                          This note is saved to the client record.
                        </p>
                      </div>

                      {/* footer actions */}
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          className="h-10 rounded-2xl border bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={busy}
                          className={[
                            "h-10 rounded-2xl px-4 text-sm font-semibold text-white",
                            "bg-slate-900 hover:opacity-90",
                            "disabled:opacity-60 disabled:cursor-not-allowed",
                          ].join(" ")}
                        >
                          {busy ? "Disabling…" : "Disable client"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
