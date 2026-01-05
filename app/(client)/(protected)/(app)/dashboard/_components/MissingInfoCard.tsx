"use client";

import { cx } from "class-variance-authority";

type BlockingTask = {
  id: string;
  title: string;
  detail?: string | null;
};

export default function MissingInfoCard({
  loading,
  blockingTasks,
}: {
  loading: boolean;
  blockingTasks: BlockingTask[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Missing Information
      </h3>

      <ul className="space-y-2 text-sm">
        {loading ? (
          <li className="text-muted-foreground animate-pulse">Loading…</li>
        ) : blockingTasks.length === 0 ? (
          <li className="text-muted-foreground">
            You don’t have any missing information right now.
            <br />
            If we need something, it will appear here.
          </li>
        ) : (
          blockingTasks.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border 
                         bg-background px-3 py-2 shadow-sm hover:bg-muted/60 transition"
            >
              {/* Task Text */}
              <div>
                <div className="font-medium text-sm text-foreground">
                  {t.title}
                </div>

                {t.detail && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.detail}
                  </div>
                )}
              </div>

              {/* Required Badge */}
              <span
                className={cx(
                  "self-start inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  "bg-amber-100 text-amber-800 border border-amber-300"
                )}
              >
                Required
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
