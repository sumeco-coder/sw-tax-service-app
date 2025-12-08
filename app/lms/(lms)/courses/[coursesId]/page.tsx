"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { configureAmplify } from "@/lib/amplifyClient";

configureAmplify();
const client = generateClient<Schema>();

type ModuleView = {
  id: string;
  title: string;
  order: number;
};

type LessonView = {
  id: string;
  moduleId: string;
  title: string;
  duration: string;
  status: "Draft" | "Published";
};

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [courseTitle, setCourseTitle] = useState<string>("Loading course…");
  const [modules, setModules] = useState<ModuleView[]>([]);
  const [lessons, setLessons] = useState<LessonView[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [moduleBusy, setModuleBusy] = useState(false);
  const [lessonBusy, setLessonBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load course + modules + lessons from Amplify Data
  useEffect(() => {
    async function load() {
      if (!courseId) return;
      setLoading(true);
      setError(null);

      try {
        const [courseRes, modulesRes, lessonsRes] = await Promise.all([
          client.models.Course.get({ id: courseId }),
          client.models.Module.list({
            filter: { courseId: { eq: courseId } },
          }),
          client.models.Lesson.list({}),
        ]);

        if (courseRes.data) {
          setCourseTitle(courseRes.data.title);
        } else {
          setCourseTitle("Course not found");
        }

        const mappedModules: ModuleView[] =
          modulesRes.data?.map((m) => ({
            id: m.id,
            title: m.title,
            order: m.sortOrder ?? 1,
          })) ?? [];

        setModules(mappedModules);

        const mappedLessons: LessonView[] =
          lessonsRes.data
            ?.filter((l) =>
              mappedModules.some((m) => m.id === l.moduleId)
            )
            .map((l) => ({
              id: l.id,
              moduleId: l.moduleId,
              title: l.title,
              duration: "10 min", // TODO: real duration later
              status: "Draft", // TODO: real status later
            })) ?? [];

        setLessons(mappedLessons);

        // default active module
        if (mappedModules.length > 0 && !activeModuleId) {
          setActiveModuleId(mappedModules[0].id);
        }
      } catch (e) {
        console.error(e);
        setError("Could not load course builder.");
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const publishedLessons = useMemo(
    () => lessons.filter((l) => l.status === "Published").length,
    [lessons]
  );
  const draftLessons = useMemo(
    () => lessons.filter((l) => l.status === "Draft").length,
    [lessons]
  );

  const activeModuleLessons = useMemo(
    () =>
      activeModuleId
        ? lessons.filter((l) => l.moduleId === activeModuleId)
        : [],
    [lessons, activeModuleId]
  );

  const activeModule = modules.find((m) => m.id === activeModuleId) ?? null;

  // ➕ Create module in Amplify Data
  async function handleAddModule() {
    if (!courseId) return;
    setModuleBusy(true);
    setError(null);

    try {
      const result = await client.models.Module.create({
        courseId,
        title: `New Module ${modules.length + 1}`,
        description: "",
        sortOrder: modules.length + 1,
      });

      const created = result.data;
      if (!created) {
        setError("Failed to create module.");
        return;
      }

      const newModule: ModuleView = {
        id: created.id,
        title: created.title,
        order: created.sortOrder ?? modules.length + 1,
      };

      setModules((prev) => [...prev, newModule]);
      setActiveModuleId(created.id);
    } catch (e) {
      console.error(e);
      setError("Something went wrong creating the module.");
    } finally {
      setModuleBusy(false);
    }
  }

  // ➕ Create lesson in Amplify Data for the active module
  async function handleAddLesson() {
    if (!activeModuleId) {
      setError("Create or select a module before adding a lesson.");
      return;
    }

    setLessonBusy(true);
    setError(null);

    try {
      const currentModuleLessons = lessons.filter(
        (l) => l.moduleId === activeModuleId
      );
      const nextOrder = currentModuleLessons.length + 1;

      const result = await client.models.Lesson.create({
        moduleId: activeModuleId,
        title: `New Lesson ${nextOrder}`,
        content: "",
        videoUrl: "",
        sortOrder: nextOrder,
        isRequired: true,
      });

      const created = result.data;
      if (!created) {
        setError("Failed to create lesson.");
        return;
      }

      const newLesson: LessonView = {
        id: created.id,
        moduleId: created.moduleId,
        title: created.title,
        duration: "10 min", // placeholder
        status: "Draft",
      };

      setLessons((prev) => [...prev, newLesson]);
    } catch (e) {
      console.error(e);
      setError("Something went wrong creating the lesson.");
    } finally {
      setLessonBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-400 mb-1">
            Course Builder
          </p>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-50">
            {courseTitle}
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-300 max-w-xl">
            Organize modules and lessons for this course. Later you can assign
            it to roles like{" "}
            <span className="font-semibold">New Preparer</span> or{" "}
            <span className="font-semibold">Reviewer</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800 hover:border-slate-500 transition">
            👁 Preview as learner
          </button>
          <button className="inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-sky-900/50 hover:bg-sky-600 transition">
            📤 Publish updates
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 text-[11px] text-red-100">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Modules
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-50">
              {modules.length}
            </span>
            <span className="text-xs text-slate-400">
              Break training into small chunks
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Lessons
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-slate-50">
                {publishedLessons}
              </span>
              <span className="text-[11px] text-emerald-200">published</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-slate-50">
                {draftLessons}
              </span>
              <span className="text-[11px] text-slate-300">draft</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/40 bg-sky-950/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
            Suggested structure
          </p>
          <p className="mt-2 text-xs text-sky-50/90">
            Intro → Intake & ID → Credits & red flags → Review & closing the
            file. Keep each lesson under 20 minutes if possible.
          </p>
        </div>
      </div>

      {/* Main builder area */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr,2fr]">
        {/* Modules column */}
        <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Modules in this course
              </h2>
              <p className="text-xs text-slate-400">
                Each module can hold several short, focused lessons.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddModule}
              disabled={moduleBusy}
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {moduleBusy ? "Adding…" : "➕ Add module"}
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Loading modules…</p>
          ) : modules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-3 py-4 text-center text-xs text-slate-300">
              No modules yet. Start by breaking the course into 3–6 main phases.
            </div>
          ) : (
            <div className="space-y-2">
              {modules.map((mod) => {
                const isActive = mod.id === activeModuleId;

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModuleId(mod.id)}
                    className={[
                      "w-full rounded-xl border px-3 py-2 text-left text-xs transition",
                      isActive
                        ? "border-sky-500/50 bg-sky-900/30 text-sky-50 shadow-sm shadow-sky-900/40"
                        : "border-slate-700 bg-slate-950/40 text-slate-200 hover:border-sky-500/40 hover:bg-slate-900/80",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-slate-300 border border-slate-600">
                          {mod.order}
                        </span>
                        <span className="font-medium">{mod.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">•••</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Lessons column */}
        <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                {activeModule
                  ? `Lessons in "${activeModule.title}"`
                  : "Lessons in this module"}
              </h2>
              <p className="text-xs text-slate-400">
                Keep each lesson focused on a single outcome you want the
                preparer to understand.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddLesson}
              disabled={lessonBusy}
              className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-sky-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {lessonBusy ? "Adding…" : "➕ Add lesson"}
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Loading lessons…</p>
          ) : activeModuleLessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-3 py-4 text-center text-xs text-slate-300">
              No lessons yet. Start with a short video or written lesson
              explaining what this module is about and what “done” looks like.
            </div>
          ) : (
            <div className="space-y-2">
              {activeModuleLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs hover:border-sky-400/60 hover:bg-slate-900/90 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-50">
                          {lesson.title}
                        </span>
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            lesson.status === "Published"
                              ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40"
                              : "bg-slate-800 text-slate-200 border border-slate-600",
                          ].join(" ")}
                        >
                          {lesson.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {lesson.duration} • Later you can add video, text, quiz
                        questions, and attachments.
                      </p>
                    </div>

                    <button className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-200 hover:border-sky-400 hover:text-sky-100 transition">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
