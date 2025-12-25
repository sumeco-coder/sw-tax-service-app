"use client";

import * as React from "react";

export default function PreviewSection({ html }: { html: string }) {
  const [open, setOpen] = React.useState(true);

  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#202030]">Preview</h2>
          <p className="text-sm text-[#202030]/70">
            This shows the rendered HTML in an iframe.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 overflow-hidden rounded-2xl border">
          <iframe
            title="Email Preview"
            className="h-[520px] w-full bg-white"
            srcDoc={html || "<p style='padding:16px'>No HTML to preview.</p>"}
          />
        </div>
      ) : null}
    </section>
  );
}
