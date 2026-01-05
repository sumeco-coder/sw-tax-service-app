// app/(client)/(protected)/(app)/dashboard/_components/NextStepsCard.tsx
"use client";

import Link from "next/link";
import { Card } from "@/app/(client)/(protected)/(app)/dashboard/_components/Card";
// or better long-term: import { Card } from "@/components/ui/Card";

export default function NextStepsCard({
  year,
  progressPercent,
  currentStepIndex,
  totalSteps,
  currentStepConfig,
  isDone,
}: {
  year: number;
  progressPercent: number;
  currentStepIndex: number;
  totalSteps: number;
  currentStepConfig: {
    label: string;
    description: string;
    href: string;
  };
  isDone: boolean;
}) {
  return (
    <Card title={`Next Steps for ${year}`} className="shadow-sm">
      <div className="space-y-3 text-sm">
        {/* Progress Top Row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <span>{progressPercent}% complete</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-[linear-gradient(90deg,#f00067,#4a0055)] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Description */}
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {isDone ? "Status" : "Next up"}
          </div>

          <div className="mt-1 font-medium text-foreground">
            {currentStepConfig.label}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {currentStepConfig.description}
          </p>
        </div>

        {/* CTA */}
        <div className="mt-3">
          {isDone ? (
            <Link
              href={`/returns?year=${year}`}
              className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs 
                         font-medium text-foreground hover:bg-muted transition"
            >
              View your filed return
            </Link>
          ) : (
            <Link
              href={currentStepConfig.href}
              className="inline-flex items-center rounded-lg 
                         bg-[linear-gradient(90deg,#f00067,#4a0055)] px-3 py-1.5 
                         text-xs font-medium text-white shadow-sm shadow-pink-500/30
                         hover:brightness-110 transition"
            >
              Go to this step
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
