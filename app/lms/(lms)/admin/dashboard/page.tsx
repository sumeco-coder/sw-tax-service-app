// app/lms/(lms)/admin/dashboard/page.tsx
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
  const publishedCount = mockCourses.filter((c) => c.status === "Published")
    .length;
  const draftCount = mockCourses.filter((c) => c.status === "Draft").length;
  const totalLearners = mockCourses.reduce((sum, c) => sum + c.learners, 0);

  return (
    <div className="space-y-6">
      {/* Top row: title + CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            LMS Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build once, reuse every tax season. Manage courses, SOPs, and
            training for your entire tax team.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition">
            ✏️ Draft a new lesson
          </button>

          <button
            className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-md transition hover:opacity-95"
            style={{ background: "var(--brand-gradient)" }}
          >
            ➕ Create course
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Active courses
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">
              {mockCourses.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {publishedCount} published • {draftCount} draft
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Team members in training
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">
              {totalLearners}
            </span>
            <span className="text-xs text-muted-foreground">
              Auto-assign courses per role later
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            SOP coverage
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">68%</span>
              <span className="text-xs text-muted-foreground">
                key workflows documented
              </span>
            </div>
            <button className="text-[11px] text-accent hover:underline">
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
              <h2 className="text-sm font-semibold text-foreground">
                Courses in your LMS
              </h2>
              <p className="text-xs text-muted-foreground">
                Start with 2–3 core trainings: onboarding, due diligence, and
                quality review.
              </p>
            </div>

            <button className="hidden sm:inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] text-foreground hover:bg-muted/40 transition">
              🧱 Course templates
            </button>
          </div>

          <div className="space-y-3">
            {mockCourses.map((course) => (
              <div
                key={course.id}
                className="group rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/40 transition"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">
                        {course.title}
                      </h3>

                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                          course.status === "Published"
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-muted text-muted-foreground border-border",
                        ].join(" ")}
                      >
                        {course.status}
                      </span>

                      <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                        {course.level}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>

                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Last updated {course.lastUpdated}
                    </p>
                  </div>

                  <div className="flex flex-row items-end gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">
                          Enrolled
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {course.learners}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">
                          Modules
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {course.modules}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/lms/courses/${course.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/40 hover:border-primary/40 transition"
                    >
                      Open builder →
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {mockCourses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                <p className="text-sm font-medium text-foreground">
                  No courses yet.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start with one “New Preparer Bootcamp” and one “Due Diligence
                  & Compliance” course.
                </p>
                <button
                  className="mt-3 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-95"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  ➕ Create your first course
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right: next steps + checklist */}
        <section className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">
              Next steps to set up your LMS
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Think of this as your “build the system once” checklist.
            </p>

            <ul className="mt-3 space-y-2 text-xs text-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-accent">✓</span>
                <span>
                  Map out your <span className="font-semibold">New Preparer</span>{" "}
                  onboarding into 4–6 modules.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-accent">✓</span>
                <span>
                  Turn your existing{" "}
                  <span className="font-semibold">SOP documents</span> into
                  lessons or resources inside each course.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-primary">•</span>
                <span>
                  Decide which courses each role must complete:{" "}
                  <span className="font-semibold">
                    new preparer, reviewer, office manager
                  </span>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-primary">•</span>
                <span>
                  Add 3–5 <span className="font-semibold">quiz questions</span>{" "}
                  per module to confirm understanding.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">
              This season&apos;s focus
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Use this LMS to reduce “I didn&apos;t know” mistakes from your team.
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-foreground">
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
