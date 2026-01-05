"use client";

import { useState } from "react";

export default function WhyTooltip({
  text,
}: {
  text: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        aria-label="Why is this taxed?"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold leading-none hover:bg-muted"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>

      {open && (
        <div className="absolute left-1/2 top-6 z-50 w-56 -translate-x-1/2 rounded-md border bg-background p-2 text-xs shadow-lg">
          {text}
        </div>
      )}
    </span>
  );
}
