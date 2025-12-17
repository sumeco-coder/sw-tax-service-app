import Link from "next/link";

const articles = [
  { title: "Top 10 documents to gather before you file", href: "/tax-knowledge/docs-checklist" },
];

export default function IrsNoticesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/tax-knowledge" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Back to Tax Knowledge
        </Link>

        <div className="mt-4 rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">IRS Notices</h1>
          <p className="mt-2 text-slate-600">
            Coming soon: a simple guide to common IRS letters and what to do next.
          </p>

          <div className="mt-8 grid gap-4">
            {articles.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-2xl border bg-slate-50 p-6 hover:shadow-sm"
              >
                <div className="text-lg font-semibold text-slate-900">{a.title}</div>
                <div className="mt-2 text-sm font-semibold text-blue-700">Read →</div>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/site/waitlist"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Join the waitlist
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
