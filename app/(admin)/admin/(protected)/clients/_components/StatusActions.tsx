// app/(admin)/admin/(protected)/clients/_components/StatusActions.tsx
"use client";

import * as React from "react";
import { setClientStatus } from "../actions";

type Props = {
  userId: string;
  status: "active" | "disabled";
  disabledReason?: string | null;
};

export function StatusActions({ userId, status, disabledReason }: Props) {
  const [open, setOpen] = React.useState(false);

  const isDisabled = status === "disabled";

  return (
    <>
      {/* ENABLE (no modal) */}
      {isDisabled ? (
        <form action={setClientStatus}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="status" value="active" />
          <button
            className="rounded-xl border px-3 py-1.5 text-xs whitespace-nowrap shrink-0 transition
                       cursor-pointer active:scale-[0.98]
                       bg-green-100 text-green-800 hover:bg-green-200"
            title={disabledReason ? `Disabled: ${disabledReason}` : "Enable user"}
          >
            Enable
          </button>
        </form>
      ) : (
        <>
          {/* DISABLE (opens modal) */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl border px-3 py-1.5 text-xs whitespace-nowrap shrink-0 transition
                       cursor-pointer active:scale-[0.98]
                       bg-red-100 text-red-800 hover:bg-red-200"
            title="Disable user access"
          >
            Disable
          </button>

          {open && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              onMouseDown={() => setOpen(false)}
            >
              {/* overlay */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

              {/* modal */}
              <div
                className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-sm font-semibold text-black">
                  Disable this client?
                </div>
                <p className="mt-1 text-sm text-black/60">
                  They will be blocked from using the portal until re-enabled.
                </p>

                <form
                  action={setClientStatus}
                  onSubmit={() => setOpen(false)}
                  className="mt-4 space-y-3"
                >
                  <input type="hidden" name="userId" value={userId} />
                  <input type="hidden" name="status" value="disabled" />

                  <div>
                    <label className="block text-xs font-medium text-black/70">
                      Reason (optional)
                    </label>
                    <textarea
                      name="reason"
                      rows={3}
                      placeholder="Example: identity verification needed, duplicate account, etc."
                      className="mt-1 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm
                                 outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm
                                 hover:bg-black/5 transition"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="rounded-2xl border px-3 py-2 text-sm
                                 bg-red-600 text-white hover:bg-red-700 transition"
                    >
                      Disable client
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
