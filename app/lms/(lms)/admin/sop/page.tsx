"use client";

type SopItem = {
  id: string;
  title: string;
  category: "Onboarding" | "Due Diligence" | "Operations" | "HR" | "Other";
  format: "PDF" | "Doc" | "Link";
  lastUpdated: string;
  usedInCourses: number;
};

const sopItems: SopItem[] = [
  {
    id: "s1",
    title: "New Client Intake & ID Verification",
    category: "Onboarding",
    format: "PDF",
    lastUpdated: "3 days ago",
    usedInCourses: 2,
  },
  {
    id: "s2",
    title: "EITC Due Diligence Checklist",
    category: "Due Diligence",
    format: "Doc",
    lastUpdated: "1 week ago",
    usedInCourses: 3,
  },
  {
    id: "s3",
    title: "Final Review Before E-file",
    category: "Due Diligence",
    format: "PDF",
    lastUpdated: "Yesterday",
    usedInCourses: 1,
  },
  {
    id: "s4",
    title: "Seasonal Staff Onboarding Flow",
    category: "HR",
    format: "Link",
    lastUpdated: "2 weeks ago",
    usedInCourses: 1,
  },
];

const categories = [
  "All",
  "Onboarding",
  "Due Diligence",
  "Operations",
  "HR",
  "Other",
] as const;

export default function SopLibraryPage() {
  const activeCategory: (typeof categories)[number] = "All";

  const filtered =
    activeCategory === "All"
      ? sopItems
      : sopItems.filter((s) => s.category === activeCategory);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-400 mb-1">
            SOP Library
          </p>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-50">
            Standard Operating Procedures
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-300 max-w-2xl">
            This is the brain of your tax firm. Turn the way you actually work
            into clear, documented steps your team can follow without guessing.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800 hover:border-slate-500 transition">
            📂 Upload SOP
          </button>
          <button className="inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-sky-900/50 hover:bg-sky-600 transition">
            🧱 Build SOP from template
          </button>
        </div>
      </div>

      {/* Filters & search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2 text-[11px]">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                type="button"
                className={[
                  "rounded-full px-3 py-1 transition",
                  isActive
                    ? "bg-sky-500 text-white shadow-sm shadow-sky-900/50"
                    : "bg-slate-950/60 text-slate-300 border border-slate-700 hover:border-sky-400 hover:text-sky-100",
                ].join(" ")}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="w-full md:w-64">
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search SOPs (e.g. ID check, intake)"
              className="flex-1 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SOP list + guidance */}
      <div className="grid gap-4 lg:grid-cols-[1.8fr,1.2fr]">
        {/* SOP cards */}
        <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                SOPs you&apos;ve added
              </h2>
              <p className="text-xs text-slate-400">
                Link these directly to lessons so your team always has a written
                backup.
              </p>
            </div>
            <p className="text-[11px] text-slate-400">
              {filtered.length} SOP{filtered.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {filtered.map((sop) => (
              <div
                key={sop.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 hover:border-sky-400/60 hover:bg-slate-900/90 transition md:flex-row md:items-center md:justify-between"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-50">
                      {sop.title}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-600">
                      {sop.category}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-600">
                      {sop.format}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Last updated {sop.lastUpdated}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Used in</p>
                    <p className="text-xs font-semibold text-slate-50">
                      {sop.usedInCourses} course
                      {sop.usedInCourses === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 hover:border-sky-400 hover:text-sky-100 transition">
                    Open
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-3 py-4 text-center text-slate-300">
                No SOPs in this category yet. Start by documenting how you want
                intakes, ID checks, notes, and final reviews done.
              </div>
            )}
          </div>
        </section>

        {/* Guidance panel */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-sky-500/40 bg-sky-950/40 p-4">
            <h2 className="text-sm font-semibold text-sky-100">
              How to think about SOPs
            </h2>
            <p className="mt-1 text-xs text-sky-50/90">
              Your SOP library is proof that you trained your team and gave them
              a clear process to follow.
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-sky-50/90">
              <li>• Start with client-facing steps: intake, docs, ID, notes.</li>
              <li>• Add internal-only SOPs: review, e-file, quality control.</li>
              <li>• Link each SOP to at least one course or lesson.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
