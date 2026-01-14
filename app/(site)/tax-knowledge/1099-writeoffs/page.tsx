import Link from "next/link";
import { ArticleLayout } from "@/components/tax-knowledge/ArticleLayout";

const categories = [
  {
    title: "Common expenses",
    items: [
      "Supplies and materials",
      "Software and subscriptions",
      "Business phone/internet (business portion)",
      "Marketing and advertising",
      "Professional services (bookkeeping, legal, contractor help)",
    ],
  },
  {
    title: "Vehicle & travel",
    items: [
      "Business mileage (keep a mileage log)",
      "Parking and tolls (business)",
      "Business travel (airfare, hotels) when primarily for work",
      "Meals may be limited — keep receipts and notes",
    ],
  },
  {
    title: "Home office (if eligible)",
    items: [
      "Dedicated workspace used regularly for business",
      "Portion of rent or mortgage interest, utilities, insurance (based on square footage)",
      "Office supplies or furniture (depending on use and cost)",
    ],
  },
  {
    title: "Education",
    items: [
      "Courses or books that maintain or improve skills in your current business",
      "Licensing and continuing education fees (if related to your work)",
    ],
  },
];

export default function Writeoffs1099Page() {
  return (
    <ArticleLayout
      title="Common Write-Offs for 1099 Contractors"
      subtitle="Ordinary and necessary expenses self-employed individuals commonly deduct."
      badges={["Small Business", "1099 Contractors"]}
      categoryHref="/tax-knowledge/business"
      categoryLabel="Small Business"
    >
      {categories.map((c) => (
        <section
          key={c.title}
          className="rounded-xl border border-border bg-secondary/60 p-6"
        >
          <h2 className="text-lg font-semibold">{c.title}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
            {c.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}

      {/* Pro Tip */}
      <section
        className="rounded-xl p-6 text-primary-foreground"
        style={{ background: "var(--brand-gradient)" }}
      >
        <div className="text-lg font-semibold">Pro tip</div>
        <p className="mt-1 text-primary-foreground/85">
          Keep receipts and a simple spreadsheet of totals by category.
          Strong records reduce stress and help maximize legitimate deductions.
        </p>
      </section>

      {/* CTAs */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/waitlist"
          className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold text-white shadow-sm"
          style={{ background: "var(--brand-gradient)" }}
        >
          Join the waitlist
        </Link>

        <Link
          href="/tax-knowledge/docs-checklist"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 font-semibold hover:bg-muted"
        >
          Docs checklist →
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: This is general information and not tax advice for your specific
        situation.
      </p>
    </ArticleLayout>
  );
}
