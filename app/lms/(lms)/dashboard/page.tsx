// app/lms/(lms)/dashboard/page.tsx
"use client";

import Link from "next/link";

type Course = {
  id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  status: "Draft" | "Published";
  lastUpdated: string;
  learners: number;
  modules: number;
};

const mockCourses: Course[] = [
  {
    id: "1",
    title: "New Preparer Bootcamp",
    description:
      "Step-by-step training for brand-new seasonal tax preparers to get production-ready.",
    level: "Beginner",
    status: "Published",
    lastUpdated: "2 days ago",
    learners: 7,
    modules: 6,
  },
  {
    id: "2",
    title: "Due Diligence & Compliance",
    description:
      "Teach your team how to document properly, avoid penalties, and protect your EFIN.",
    level: "Intermediate",
    status: "Published",
    lastUpdated: "1 week ago",
    learners: 4,
    modules: 5,
  },
  {
    id: "3",
    title: "Advanced Credits & Red Flags",
    description:
      "Deep dive into EITC, CTC, ACTC, and common audit triggers your team must spot.",
    level: "Advanced",
    status: "Draft",
    lastUpdated: "Today",
    learners: 0,
    modules: 4,
  },
];

export default function LmsDashboardPage() {
  const publishedCount = mockCourses.filter((c) => c.status === "Published").length;
  const draftCount = mockCourses.filter((c) => c.status === "Draft").length;
  const totalLearners = mockCourses.reduce((sum, c) => sum + c.learners, 0);

  return (
    <div className="space-y-6">
      {/* Top row: title + CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-50">
            LMS Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Build once, reuse every tax season. Manage courses, SOPs, and
            training for your entire tax team.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800 hover:border-slate-500 transition">
            ✏️ Draft a new lesson
          </button>
          <button className="inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-900/50 hover:bg-sky-600 transition">
            ➕ Create course
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 shadow-sm shadow-slate-900/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Active courses
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-50">
              {mockCourses.length}
            </span>
            <span className="text-xs text-slate-400">
              {publishedCount} published • {draftCount} draft
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/40 bg-sky-950/40 px-4 py-3 shadow-sm shadow-sky-900/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            Team members in training
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-50">
              {totalLearners}
            </span>
            <span className="text-xs text-sky-200/90">
              Auto-assign courses per role later
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 shadow-sm shadow-emerald-900/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            SOP coverage
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-50">68%</span>
              <span className="text-xs text-emerald-100/80">
                key workflows documented
              </span>
            </div>
            <button className="text-[11px] text-emerald-200 hover:underline">
              View SOP gaps →
            </button>
          </div>
        </div>
      </div>

      {/* Quick actions + overview */}
      <div className="grid gap-4 lg:grid-cols-[2fr,1.4fr]">
        {/* Left: course list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Courses in your LMS
              </h2>
              <p className="text-xs text-slate-400">
                Start with 2–3 core trainings: onboarding, due diligence, and
                quality review.
              </p>
            </div>
            <button className="hidden sm:inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800 transition">
              🧱 Course templates
            </button>
          </div>

          <div className="space-y-3">
            {mockCourses.map((course) => (
              <div
                key={course.id}
                className="group rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-sm shadow-slate-900/40 hover:border-sky-400/50 hover:shadow-sky-900/40 transition"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-50">
                        {course.title}
                      </h3>
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          course.status === "Published"
                            ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-200 border border-slate-600",
                        ].join(" ")}
                      >
                        {course.status}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-300">
                        {course.level}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                      {course.description}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Last updated {course.lastUpdated}
                    </p>
                  </div>

                  <div className="flex flex-row items-end gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400">
                          Enrolled
                        </p>
                        <p className="text-sm font-semibold text-slate-50">
                          {course.learners}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400">
                          Modules
                        </p>
                        <p className="text-sm font-semibold text-slate-50">
                          {course.modules}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/lms/courses/${course.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-sky-400 hover:text-sky-100 hover:bg-slate-900 transition"
                    >
                      Open builder →
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state for when you remove mockCourses later */}
            {mockCourses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center">
                <p className="text-sm font-medium text-slate-100">
                  No courses yet.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Start with one “New Preparer Bootcamp” and one
                  “Due Diligence & Compliance” course.
                </p>
                <button className="mt-3 inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 transition">
                  ➕ Create your first course
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right: next steps + checklist */}
        <section className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Next steps to set up your LMS
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Think of this as your “build the system once” checklist.
            </p>

            <ul className="mt-3 space-y-2 text-xs text-slate-200">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-emerald-400">✓</span>
                <span>
                  Map out your{" "}
                  <span className="font-semibold">New Preparer</span> onboarding
                  into 4–6 modules.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-emerald-400">✓</span>
                <span>
                  Turn your existing{" "}
                  <span className="font-semibold">SOP documents</span> into
                  lessons or resources inside each course.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-sky-300">•</span>
                <span>
                  Decide which courses each role must complete:{" "}
                  <span className="font-semibold">
                    new preparer, reviewer, office manager
                  </span>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-sky-300">•</span>
                <span>
                  Add 3–5{" "}
                  <span className="font-semibold">quiz questions</span> per
                  module to confirm understanding.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-sky-950/40 p-4">
            <h2 className="text-sm font-semibold text-sky-100">
              This season&apos;s focus
            </h2>
            <p className="mt-1 text-xs text-sky-100/80">
              Use this LMS to reduce “I didn&apos;t know” mistakes from your
              team.
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-sky-50/90">
              <li>• Standardize how intakes, ID checks, and notes are done.</li>
              <li>• Train preparers once, then plug them into your process.</li>
              <li>• Keep proof of training if anything is ever questioned.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
