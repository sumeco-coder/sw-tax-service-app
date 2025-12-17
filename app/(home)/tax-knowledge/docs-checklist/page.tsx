// app/(home)/tax-knowledge/docs-checklist/page.tsx
import Link from "next/link";

const sections = [
  {
    title: "Income",
    items: [
      "W-2s (all employers)",
      "1099-NEC / 1099-MISC (contract work)",
      "1099-G (unemployment, state refunds)",
      "1099-INT / 1099-DIV / 1099-B (bank/investments)",
      "SSA-1099 (Social Security)",
      "K-1 (partnerships/S-corps/trusts)",
    ],
  },
  {
    title: "Identity & Household",
    items: [
      "Photo ID (for you and spouse)",
      "Social Security cards/ITIN letters for everyone on the return",
      "Birthdates + relationship info for dependents",
      "Childcare provider info (name, address, EIN/SSN) if applicable",
    ],
  },
  {
    title: "Deductions & Credits",
    items: [
      "Form 1098 (mortgage interest)",
      "Property tax statements",
      "Student loan interest (1098-E)",
      "Tuition (1098-T) + receipts for books/supplies if required",
      "Charitable contributions (cash + non-cash)",
      "Medical expenses (if itemizing)",
      "IRA contributions (Form 5498 or contribution receipts)",
    ],
  },
  {
    title: "Small Business / 1099",
    items: [
      "Income summary (1099s + any cash/other income)",
      "Expense totals (supplies, software, phone, internet, etc.)",
      "Mileage log or vehicle expense records",
      "Home office info (sq ft and household expense totals) if applicable",
      "Business bank statements (helpful for reconciliation)",
    ],
  },
];

export default function DocsChecklistPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/tax-knowledge" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Back to Tax Knowledge
        </Link>

        <div className="mt-4 rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Top documents to gather before you file
          </h1>
          <p className="mt-2 text-slate-600">
            Use this checklist to get organized. Having these ready makes filing faster and helps avoid missed credits.
          </p>

          <div className="mt-8 space-y-6">
            {sections.map((s) => (
              <section key={s.title} className="rounded-2xl border bg-slate-50 p-6">
                <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-white">
            <div className="text-lg font-semibold">Want SW Tax to handle everything?</div>
            <p className="mt-1 text-slate-200">
              Join the waitlist and we’ll send your secure onboarding link when we open.
            </p>
            <div className="mt-4">
              <Link
                href="/site/waitlist"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-100"
              >
                Join the waitlist
              </Link>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Note: This is general information and not tax advice for your specific situation.
          </p>
        </div>
      </div>
    </main>
  );
}
