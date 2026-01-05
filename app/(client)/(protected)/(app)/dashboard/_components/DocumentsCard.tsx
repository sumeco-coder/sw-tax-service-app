"use client";

import type { Doc } from "@/types/dashboard";
import { fmtDate } from "@/lib/utils/dashboard"; // (you can remove this if unused)

export default function DocumentsCard({
  loading,
  docs,
  year,
}: {
  loading: boolean;
  docs: Doc[];
  year: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Documents</h3>
        {docs.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {docs.length} uploaded
          </span>
        )}
      </div>

      <ul className="space-y-2 text-sm">
        {loading ? (
          <li className="text-sm text-muted-foreground animate-pulse">
            Loading…
          </li>
        ) : docs.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            No documents uploaded yet. You can upload W-2s, 1099s, and other tax
            forms from the dashboard.
          </li>
        ) : (
          docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted/60 transition"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px]">
                    📄
                  </span>
                  <span className="font-medium text-sm text-foreground">
                    {d.displayName || "Document"}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground pl-8">
                  {(d.docType || "OTHER").toUpperCase()} •{" "}
                  {d.taxYear ?? year}
                </div>
              </div>

              {d.url ? (
                <a
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">No link</span>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
