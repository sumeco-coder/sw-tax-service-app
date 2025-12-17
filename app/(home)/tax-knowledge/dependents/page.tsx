// app/(home)/tax-knowledge/dependents/page.tsx
import Link from "next/link";

const rules = [
  {
    title: "Qualifying Child (common examples)",
    points: [
      "Must be related (child, stepchild, foster child, sibling, etc.)",
      "Lived with you more than half the year (some exceptions apply)",
      "Generally under age 19, or under 24 if a full-time student",
      "Did not provide more than half of their own support",
    ],
  },
  {
    title: "Qualifying Relative (not necessarily your child)",
    points: [
      "May live with you all year OR be a specific type of relative",
      "You generally provide more than half of their support",
      "Their income must be under certain limits (varies by rules/year)",
      "They can’t be claimed as someone else’s qualifying child",
    ],
  },
  {
    title: "Documents that help",
    points: [
      "School/medical records showing address",
      "Daycare records, lease docs, or official mail showing residency",
      "Support records (who paid what) for relatives you support",
      "Social Security numbers/ITINs for dependents",
    ],
  },
];

export default function DependentsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/tax-knowledge" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Back to Tax Knowledge
        </Link>

        <div className="mt-4 rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            What counts as a dependent?
          </h1>
          <p className="mt-2 text-slate-600">
            Dependents can affect filing status and credits. Here’s a simple overview of the two common categories.
          </p>

          <div className="mt-8 space-y-4">
            {rules.map((r) => (
              <section key={r.title} className="rounded-2xl border bg-slate-50 p-6">
                <h2 className="text-lg font-semibold text-slate-900">{r.title}</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                  {r.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-blue-50 p-6">
            <div className="text-base font-semibold text-slate-900">Quick tip</div>
            <p className="mt-1 text-slate-700">
              If more than one person could claim the same child, there are “tie-breaker” rules. Don’t guess—get it
              right to avoid IRS issues.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/site/waitlist"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Join the waitlist
            </Link>
            <Link
              href="/tax-knowledge/docs-checklist"
              className="inline-flex items-center justify-center rounded-xl border bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-50"
            >
              Docs checklist →
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Note: This is general information and not tax advice for your specific situation.
          </p>
        </div>
      </div>
    </main>
  );
}
