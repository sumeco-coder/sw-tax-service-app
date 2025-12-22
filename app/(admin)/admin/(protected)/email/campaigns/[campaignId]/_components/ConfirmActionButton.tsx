// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/ConfirmActionButton.tsx
"use client";

import { useState, useTransition } from "react";

type Props = {
  action: () => Promise<void>;
  confirmText: string;
  children: React.ReactNode;

  /**
   * Extra button classes from the page
   * (ex: rounded-xl border px-3 py-2 ...)
   */
  className?: string;

  disabled?: boolean;
};

export default function ConfirmActionButton({
  action,
  confirmText,
  children,
  className = "",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDisabled = disabled || isPending;

  function run() {
    startTransition(async () => {
      try {
        await action();
      } finally {
        setOpen(false);
      }
    });
  }

  // ✅ guarantee cursor-pointer on the real button
  const btnClass = [
    "cursor-pointer",
    "select-none",
    "disabled:cursor-not-allowed",
    "disabled:opacity-60",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        type="button"
        className={btnClass}
        disabled={isDisabled}
        onClick={() => setOpen(true)}
      >
        {isPending ? "Working..." : children}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-4 shadow-lg">
            <div className="text-sm font-semibold text-[#202030]">
              Confirm action
            </div>

            <p className="mt-2 text-sm text-[#202030]/80">{confirmText}</p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="cursor-pointer rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={run}
                disabled={isPending}
              >
                {isPending ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
