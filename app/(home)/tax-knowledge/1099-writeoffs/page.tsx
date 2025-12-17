// app/(app)/tax-knowledge/writeoffs-1099/page.tsx
import Link from "next/link";

const categories = [
  {
    title: "Common expenses",
    items: [
      "Supplies and materials",
      "Software and subscriptions",
      "Business phone/internet (business portion)",
      "Marketing/advertising",
      "Professional services (bookkeeping, legal, contractor help)",
    ],
  },
  {
    title: "Vehicle & travel",
    items: [
      "Business mileage (keep a mileage log)",
      "Parking and tolls (business)",
      "Business travel (airfare, hotels) when primarily for work",
      "Meals may be limited—keep receipts and notes",
    ],
  },
  {
    title: "Home office (if eligible)",
    items: [
      "Dedicated workspace used regularly for business",
      "Portion of rent/mortgage interest, utilities, insurance (based on sq ft)",
      "Office supplies/furniture (depending on use and cost)",
    ],
  },
  {
    title: "Education",
    items: [
      "Courses/books that maintain or improve skills in your current business",
      "Licensing/CE fees (if related to your work)",
    ],
  },
];

export default function Writeoffs1099Page() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/tax-knowledge" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Back to Tax Knowledge
        </Link>

        <div className="mt-4 rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Common write-offs for 1099 contractors
          </h1>
          <p className="mt-2 text-slate-600">
            If you’re self-employed, you can often deduct ordinary and necessary business expenses. Here are common
            categories to track.
          </p>

          <div className="mt-8 space-y-4">
            {categories.map((c) => (
              <section key={c.title} className="rounded-2xl border bg-slate-50 p-6">
                <h2 className="text-lg font-semibold text-slate-900">{c.title}</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                  {c.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-white">
            <div className="text-lg font-semibold">Pro tip</div>
            <p className="mt-1 text-slate-200">
              Keep receipts and a simple spreadsheet of totals by category. Good records reduce stress and maximize
              legitimate deductions.
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
