"use client";

import { cx } from "class-variance-authority";

type TimelineStage = {
  id: string;
  label: string;
};

export default function TimelineCard({
  year,
  status,
  currentStatusStage,
  nextStatusStage,
  RETURN_TIMELINE_STAGES,
  statusStageIndex,
}: {
  year: number;
  status: string;
  currentStatusStage?: { label: string; helper?: string } | null;
  nextStatusStage?: { helper: string } | null;
  RETURN_TIMELINE_STAGES: TimelineStage[];
  statusStageIndex: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Return timeline for {year}
      </h3>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">
            Your {year} return is:
          </div>
          <div className="text-sm font-medium text-foreground">
            {currentStatusStage?.label ?? status}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {currentStatusStage?.helper ??
              "We’re processing your return and will update you if anything changes."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {nextStatusStage
              ? `Next: ${nextStatusStage.helper}`
              : "Next: All done for now—no further action needed unless we contact you."}
          </p>
        </div>

        {/* Horizontal timeline */}
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            {RETURN_TIMELINE_STAGES.map((stage, index) => {
              const isCompleted = index < statusStageIndex;
              const isCurrent = index === statusStageIndex;

              return (
                <div
                  key={stage.id}
                  className="flex-1 flex flex-col items-center gap-1 min-w-0"
                >
                  <div className="flex items-center gap-1 w-full">
                    {/* Line before dot (except first) */}
                    {index > 0 && (
                      <div
                        className={cx(
                          "h-[2px] flex-1",
                          index <= statusStageIndex
                            ? "bg-emerald-400"
                            : "bg-muted"
                        )}
                      />
                    )}

                    {/* Dot */}
                    <div
                      className={cx(
                        "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
                        isCurrent
                          ? "bg-emerald-500 text-emerald-950 border-emerald-400 shadow shadow-emerald-500/40"
                          : isCompleted
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                      title={stage.label}
                    >
                      {index + 1}
                    </div>

                    {/* Extra line from the first dot forward */}
                    {index === 0 && RETURN_TIMELINE_STAGES.length > 1 && (
                      <div
                        className={cx(
                          "h-[2px] flex-1",
                          statusStageIndex > 0
                            ? "bg-emerald-400"
                            : "bg-muted"
                        )}
                      />
                    )}
                  </div>

                  <div className="mt-1 text-[10px] text-center text-muted-foreground truncate w-full">
                    {stage.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
