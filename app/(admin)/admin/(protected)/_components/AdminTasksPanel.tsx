"use client";

import { useMemo, useState } from "react";

type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

type TaskRow = {
  id: string;
  userId: string;
  title: string;
  detail: string | null;
  status: TaskStatus;
  taxYear?: number | null; // if you added Option A
  createdAt?: string;
  updatedAt?: string;
};

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

function normalizeEmail(v: string) {
  return (v ?? "").trim().toLowerCase();
}

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none";
const inputFocus =
  "focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]";
const btn =
  "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed";

export default function AdminTasksPanel() {
  const currentYear = new Date().getFullYear();

  const [email, setEmail] = useState("");
  const [year, setYear] = useState<number>(currentYear);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // create form
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState<TaskStatus>("OPEN");

  const canSearch = useMemo(() => normalizeEmail(email).includes("@"), [email]);
  const canCreate = useMemo(() => canSearch && title.trim().length > 0, [canSearch, title]);

  async function loadTasks() {
    setMsg("");
    setLoading(true);
    try {
      const e = normalizeEmail(email);
      const res = await fetch(`/api/admin/tasks?email=${encodeURIComponent(e)}&year=${year}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setTasks([]);
        setMsg(j?.error ?? "Failed to load tasks.");
        return;
      }

      const rows = (await res.json()) as TaskRow[];
      setTasks(Array.isArray(rows) ? rows : []);
      if (!rows?.length) setMsg("No tasks found for that client/year.");
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message ?? "Failed to load tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function createTask() {
    setMsg("");
    setLoading(true);
    try {
      const e = normalizeEmail(email);

      const res = await fetch(`/api/admin/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: e,
          title: title.trim(),
          detail: detail.trim() || null,
          status,
          taxYear: year, // ✅ Option A
        }),
      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(j?.error ?? "Failed to create task.");
        return;
      }

      setTitle("");
      setDetail("");
      setStatus("OPEN");
      setMsg("Task created ✅");
      await loadTasks();
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message ?? "Failed to create task.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
      {/* Search row */}
      <div className="grid gap-3 md:grid-cols-[1fr_160px_140px]">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Client email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@email.com"
            className={`${inputBase} ${inputFocus}`}
          />
          <p className="mt-1 text-xs text-slate-500">
            Client must already exist in your <code>users</code> table (after sign-up).
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tax year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value || currentYear))}
            className={`${inputBase} ${inputFocus}`}
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={loadTasks}
            disabled={loading || !canSearch}
            className={btn + " w-full"}
            style={{ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }}
          >
            {loading ? "Loading…" : "Load tasks"}
          </button>
        </div>
      </div>

      {/* Create task */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold" style={{ color: BRAND.charcoal }}>
            Create task
          </h3>
          <span className="text-xs text-slate-500">
            Shows on client dashboard as “Missing Information”
          </span>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Upload W-2 for 2025"
              className={`${inputBase} ${inputFocus}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className={`${inputBase} ${inputFocus}`}
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">Detail (optional)</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder="If you worked multiple jobs, upload all W-2s."
              className={`${inputBase} ${inputFocus}`}
            />
          </div>

          <div className="md:col-span-3">
            <button
              onClick={createTask}
              disabled={loading || !canCreate}
              className={btn + " w-full"}
              style={{ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }}
            >
              {loading ? "Saving…" : "Create task"}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {msg ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
          {msg}
        </p>
      ) : null}

      {/* Tasks list */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: BRAND.charcoal }}>
            Tasks
          </h3>
          <span className="text-xs text-slate-500">{tasks.length} total</span>
        </div>

        <div className="divide-y overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {tasks.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No tasks loaded.</div>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                    {t.detail ? (
                      <div className="mt-1 text-xs text-slate-600">{t.detail}</div>
                    ) : null}
                    <div className="mt-2 text-[11px] text-slate-500">
                      Status: <span className="font-semibold">{t.status}</span>
                      {typeof t.taxYear === "number" ? (
                        <>
                          {" "}• Year: <span className="font-semibold">{t.taxYear}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <span
                    className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }}
                  >
                    Required
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
