import Link from "next/link";

const articles = [
  { title: "What counts as a dependent?", href: "/tax-knowledge/dependents" },
  {
    title: "Top 10 documents to gather before you file",
    href: "/tax-knowledge/docs-checklist",
  },
];

export default function BasicsPage() {
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
            Tax Basics
          </h1>

          <p className="mt-2 text-muted-foreground">
            Simple guides to help you understand the fundamentals before you
            file.
          </p>

          <div className="mt-8 grid gap-4">
            {articles.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-2xl border border-border bg-secondary/60 p-6 transition hover:shadow-sm"
              >
                <div className="text-lg font-semibold text-foreground">
                  {a.title}
                </div>
                <div className="mt-2 text-sm font-semibold text-primary">
                  Read →
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/site/waitlist"
              className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold text-white shadow-sm hover:opacity-95
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ background: "var(--brand-gradient)" }}
            >
              Join the waitlist
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
