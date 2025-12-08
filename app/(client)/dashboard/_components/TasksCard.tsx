"use client";

import { cx } from "class-variance-authority";
import type { Task } from "@/types/dashboard";

export default function TasksCard({
  loading,
  tasks,
  handleMarkDone,
}: {
  loading: boolean;
  tasks: Task[];
  handleMarkDone: (id: string) => void;
}) {
  const openTasks = tasks.filter((t) => t.status !== "DONE");

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Your To-Dos</h3>
        <span className="text-[11px] text-muted-foreground">
          {openTasks.length} open
        </span>
      </div>

      <ul className="space-y-2 text-sm">
        {loading ? (
          <li className="text-sm text-muted-foreground animate-pulse">
            Loading…
          </li>
        ) : tasks.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            No tasks yet. We’ll add items here if we need anything from you.
          </li>
        ) : (
          tasks.map((t) => {
            const isDone = t.status === "DONE";

            return (
              <li
                key={t.id}
                className={cx(
                  "flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2",
                  isDone
                    ? "bg-muted/60"
                    : "bg-background hover:bg-muted/60 transition"
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {!isDone && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-[linear-gradient(90deg,#f00067,#4a0055)]" />
                    )}
                    <span
                      className={cx(
                        "font-medium text-sm",
                        isDone
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      )}
                    >
                      {t.title}
                    </span>
                  </div>

                  {t.detail && (
                    <div className="text-xs text-muted-foreground pl-4">
                      {t.detail}
                    </div>
                  )}

                  {/* Status pill */}
                  <div className="pl-4">
                    <span
                      className={cx(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        isDone
                          ? "bg-emerald-50 text-emerald-700"
                          : t.status === "IN_PROGRESS"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-amber-50 text-amber-700"
                      )}
                    >
                      {isDone
                        ? "Completed"
                        : t.status === "IN_PROGRESS"
                        ? "In progress"
                        : "Action needed"}
                    </span>
                  </div>
                </div>

                <button
                  disabled={isDone}
                  onClick={() => handleMarkDone(t.id)}
                  className={cx(
                    "text-xs px-2 py-1 rounded-lg font-medium",
                    isDone
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-[linear-gradient(90deg,#f00067,#4a0055)] text-white shadow-sm shadow-pink-500/30 hover:brightness-110 transition"
                  )}
                >
                  {isDone ? "Done" : "Mark done"}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
