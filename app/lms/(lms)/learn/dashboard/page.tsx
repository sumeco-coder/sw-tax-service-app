// app/lms/(lms)/learn/dashboard/page.tsx
import Link from "next/link";

export default function LearnerDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            My Training
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View your assigned courses and continue where you left off.
          </p>
        </div>

        <Link
          href="/lms/learn/courses"
          className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-95 transition"
          style={{ background: "var(--brand-gradient)" }}
        >
          View My Courses →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Assigned courses
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">0</p>
        </div>

        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Progress
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">0%</p>
        </div>

        <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Next lesson
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            Not started
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start a course to unlock lessons.
          </p>
        </div>
      </div>
    </div>
  );
}
