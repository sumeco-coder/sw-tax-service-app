// app/(site)/tax-knowledge/irs-notices/page.tsx
import Link from "next/link";

const articles = [
  {
    title: "No Tax on Tips: What Tipped Workers Need to Know",
    href: "/tax-knowledge/irs-notices/no-tax-on-tips-2025",
    publishedAt: "2026-01-08",
    isNew: true,
  },
  {
    title: "Top 10 documents to gather before you file",
    href: "/tax-knowledge/docs-checklist",
    publishedAt: "2025-12-15",
    isNew: false,
  },
];

export default function IrsNoticesPage() {
  return (
    <main className="min-h-screen bg-secondary/40">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/tax-knowledge"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to Tax Knowledge
        </Link>

        <nav className="mt-2 text-sm text-muted-foreground">
          <Link href="/tax-knowledge" className="hover:underline">
            Tax Knowledge
          </Link>
          <span className="mx-1">/</span>
          <span className="font-semibold text-foreground">IRS Notices</span>
        </nav>

        <div className="mt-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            IRS Notices
          </h1>

          <p className="mt-2 text-muted-foreground">
            Coming soon: a simple guide to common IRS letters and what to do
            next.
          </p>

          <div className="mt-8 grid gap-4">
            {articles.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-2xl border border-border bg-secondary/60 p-6 transition hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold text-foreground">
                    {a.title}
                  </div>

                  {a.isNew && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      NEW
                    </span>
                  )}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Published {new Date(a.publishedAt).toLocaleDateString()}
                </div>

                <div className="mt-2 text-sm font-semibold text-primary">
                  Read →
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/waitlist"
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
