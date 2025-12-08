"use client";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
            LMS Reports
          </p>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-50">
            Training reports
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl">
            Quick snapshot of how your team is progressing through courses.
            Later this can tie into real completion data and audit logs.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Average completion
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-50">72%</span>
            <span className="text-xs text-slate-400">
              Across all assigned courses
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/40 bg-sky-950/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            Lessons completed this week
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-50">34</span>
            <span className="text-xs text-sky-200/90">
              New progress in the last 7 days
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
            At-risk learners
          </p>
          <p className="mt-2 text-sm font-semibold text-amber-50">3</p>
          <p className="mt-1 text-[11px] text-amber-100/80">
            Assigned courses but little recent activity—great place to follow up.
          </p>
        </div>
      </div>

      {/* Simple table for “at-risk” and “on track” */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            On track
          </h2>
          <p className="text-[11px] text-slate-400 mb-3">
            Team members who are completing lessons consistently.
          </p>
          <ul className="space-y-2 text-xs">
            {["Senior Preparer", "Returning Seasonal Preparer"].map((name) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2"
              >
                <span className="text-slate-100">{name}</span>
                <span className="text-[11px] text-emerald-300">
                  90–100% on assigned courses
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            Needs attention
          </h2>
          <p className="text-[11px] text-slate-400 mb-3">
            Good place to focus coaching or quick check-ins.
          </p>
          <ul className="space-y-2 text-xs">
            {[
              "New Seasonal Preparer #1",
              "New Seasonal Preparer #2",
              "Office Support Staff",
            ].map((name) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2"
              >
                <span className="text-slate-100">{name}</span>
                <span className="text-[11px] text-amber-300">
                  <span className="font-semibold">Behind</span> on core courses
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Later, this page can plug into your real LMS data so you can export
        progress, show proof of training, and see who’s actually ready for busy
        season.
      </p>
    </div>
  );
}
