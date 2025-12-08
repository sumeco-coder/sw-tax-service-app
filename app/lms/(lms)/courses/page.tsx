// app/lms/(lms)/courses/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { configureAmplify } from "@/lib/amplifyClient";
import { CreateCourseButton } from "@/components/Lms/CreateCourseButton";

// make sure Amplify is configured in the browser
configureAmplify();

const client = generateClient<Schema>();

type ViewCourse = {
  id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  status: "Draft" | "Published" | "Archived";
  lastUpdated: string;
  learners: number;
  modules: number;
};

export default function CoursesListPage() {
  const [viewCourses, setViewCourses] = useState<ViewCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      try {
        const { data } = await client.models.Course.list({});
        const mapped: ViewCourse[] =
          data?.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description ?? "No description added yet.",
            level:
              c.level === "INTERMEDIATE"
                ? "Intermediate"
                : c.level === "ADVANCED"
                ? "Advanced"
                : "Beginner",
            status:
              c.status === "PUBLISHED"
                ? "Published"
                : c.status === "ARCHIVED"
                ? "Archived"
                : "Draft",
            lastUpdated: c.updatedAt
              ? new Date(c.updatedAt).toLocaleDateString()
              : "Recently",
            learners: 0, // later: count from Enrollment
            modules: 0,  // later: count from Module
          })) ?? [];

        setViewCourses(mapped);
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  const totalPublished = viewCourses.filter((c) => c.status === "Published").length;
  const totalDraft = viewCourses.filter((c) => c.status === "Draft").length;
  const totalLearners = viewCourses.reduce((sum, c) => sum + c.learners, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
            LMS Courses
          </p>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-50">
            Courses in your LMS
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl">
            Build core trainings once—onboarding, due diligence, and quality
            review—and assign them to every preparer who joins your firm.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800 hover:border-slate-500 transition">
            ✏️ Draft a new lesson
          </button>
          <CreateCourseButton />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 shadow-sm shadow-slate-900/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Total courses
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-50">
              {viewCourses.length}
            </span>
            <span className="text-xs text-slate-400">
              {totalPublished} published • {totalDraft} draft
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
              You’ll assign courses by role later
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 shadow-sm shadow-emerald-900/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Suggested structure
          </p>
          <p className="mt-2 text-xs text-emerald-50/90">
            Start with: 1) New Preparer Bootcamp, 2) Due Diligence & Compliance,
            3) Advanced Credits & Red Flags.
          </p>
        </div>
      </div>

      {/* Loading / Empty / List */}
      {loading ? (
        <p className="text-xs text-slate-400">Loading courses…</p>
      ) : viewCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center">
          <p className="text-sm font-medium text-slate-100">
            No courses yet.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Start with one “New Preparer Bootcamp” and one “Due Diligence & Compliance” course.
          </p>
          <CreateCourseButton />
        </div>
      ) : (
        <div className="space-y-3">
          {viewCourses.map((course) => (
            <div
              key={course.id}
              className="group rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-sm shadow-slate-900/40 hover:border-sky-400/50 hover:shadow-sky-900/40 transition"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-50">
                      {course.title}
                    </h2>
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
                      <p className="text-[11px] text-slate-400">Enrolled</p>
                      <p className="text-sm font-semibold text-slate-50">
                        {course.learners}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">Modules</p>
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
        </div>
      )}
    </div>
  );
}
