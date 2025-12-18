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
    <main className="min-h-screen bg-secondary/40">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/tax-knowledge"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to Tax Knowledge
        </Link>

        <div className="mt-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            What counts as a dependent?
          </h1>

          <p className="mt-2 text-muted-foreground">
            Dependents can affect filing status and credits. Here’s a simple
            overview of the two common categories.
          </p>

          <div className="mt-8 space-y-4">
            {rules.map((r) => (
              <section
                key={r.title}
                className="rounded-2xl border border-border bg-secondary/60 p-6"
              >
                <h2 className="text-lg font-semibold text-foreground">
                  {r.title}
                </h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
                  {r.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* Quick tip */}
          <div className="mt-8 rounded-2xl border border-border bg-secondary p-6">
            <div className="text-base font-semibold text-foreground">
              Quick tip
            </div>
            <p className="mt-1 text-muted-foreground">
              If more than one person could claim the same child, there are
              “tie-breaker” rules. Don’t guess—get it right to avoid IRS issues.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/site/waitlist"
              className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold text-white shadow-sm hover:opacity-95
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ background: "var(--brand-gradient)" }}
            >
              Join the waitlist
            </Link>

            <Link
              href="/tax-knowledge/docs-checklist"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 font-semibold text-foreground hover:bg-muted
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Docs checklist →
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Note: This is general information and not tax advice for your
            specific situation.
          </p>
        </div>
      </div>
    </main>
  );
}
