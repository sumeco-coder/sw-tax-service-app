"use client";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
            Team & Roles
          </p>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-50">
            Your LMS team
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl">
            Decide who can build courses, who can review, and who only needs to
            complete training. Later this will connect to your real users and
            Cognito roles.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-900/50 hover:bg-sky-600 transition">
            ➕ Add team member
          </button>
        </div>
      </div>

      {/* Role summary */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Owners / Admins
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-50">1</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Full control of LMS, courses, SOPs, and assignments.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Instructors / Leads
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-50">2</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Can create and edit courses, but not change global settings.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Learners / Preparers
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-50">8</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Can view assigned courses and mark lessons complete.
          </p>
        </div>
      </div>

      {/* Table-ish list */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100">
            People in your workspace
          </h2>
          <p className="text-[11px] text-slate-400">Design-only demo data</p>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs">
          {[
            {
              name: "You (Firm Owner)",
              email: "owner@yourtaxfirm.com",
              role: "Owner / Admin",
              status: "Active",
            },
            {
              name: "Senior Preparer",
              email: "lead@yourtaxfirm.com",
              role: "Instructor",
              status: "Active",
            },
            {
              name: "New Seasonal Preparer",
              email: "newprep@yourtaxfirm.com",
              role: "Learner",
              status: "Pending setup",
            },
          ].map((member) => (
            <div
              key={member.email}
              className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-50">{member.name}</p>
                <p className="text-[11px] text-slate-400">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-200 border border-slate-600">
                  {member.role}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200 border border-emerald-500/40">
                  {member.status}
                </span>
                <button className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 hover:border-sky-400 hover:text-sky-100 transition">
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          Later this will sync with your real user table and Cognito groups
          (admin / instructor / learner).
        </p>
      </div>
    </div>
  );
}
