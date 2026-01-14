// app/%28site%29/tax-knowledge/irs-notices/no-tax-on-tips-2025/page.tsx
import { Metadata } from "next";
import { ArticleLayout } from "@/components/tax-knowledge/ArticleLayout";
import { ArticleSchema } from "@/components/seo/ArticleSchema";
import { getArticleViews } from "@/lib/analytics/getArticleViews";
import { PageTracker } from "@/components/analytics/PageTracker";

export const metadata: Metadata = {
  title: "No Tax on Tips (2025) – What Tipped Workers Need to Know",
  description:
    "Learn how the new No Tax on Tips rule allows eligible workers to deduct up to $25,000 in qualified tips starting in 2025.",
};

export default async function Page() {
  const slug = "no-tax-on-tips-2025";
  const views = await getArticleViews(slug);
  return (
    <>
      {/* ✅ Analytics (client) */}
      <PageTracker
        slug={slug}
        title="No Tax on Tips (2025) – What Tipped Workers Need to Know"
        category="IRS Notices"
      />

      {/* SEO SCHEMA */}
      <ArticleSchema
        title="No Tax on Tips (2025) – What Tipped Workers Need to Know"
        description="Learn how the new No Tax on Tips rule allows eligible workers to deduct up to $25,000 in qualified tips starting in 2025."
        url="https://swtaxservice.com/tax-knowledge/irs-notices/no-tax-on-tips-2025"
        publishedDate="2026-01-08"
        breadcrumbs={[
          {
            name: "Tax Knowledge",
            url: "https://swtaxservice.com/tax-knowledge",
          },
          {
            name: "IRS Notices",
            url: "https://swtaxservice.com/tax-knowledge/irs-notices",
          },
          {
            name: "No Tax on Tips",
            url: "https://swtaxservice.com/tax-knowledge/irs-notices/no-tax-on-tips-2025",
          },
        ]}
      />

      {/* ARTICLE */}
      <ArticleLayout
        title="No Tax on Tips: What Tipped Workers Need to Know"
        subtitle="Published by SW Tax Service · January 2026"
        badges={["IRS Update", "2025 Tax Year"]}
        categoryHref="/tax-knowledge/irs-notices"
        categoryLabel="IRS Notices"
        viewCount={views}
      >
        <p>
          A new federal tax law may significantly reduce the amount of federal
          income tax paid by tipped workers. Known as the{" "}
          <strong>“No Tax on Tips”</strong> provision, this rule allows eligible
          taxpayers to deduct qualified tips starting with the 2025 tax year.
        </p>

        <h2>What Is the “No Tax on Tips” Rule?</h2>
        <p>
          This provision allows eligible workers to deduct qualified tips from
          federal taxable income. The deduction is available whether you itemize
          deductions or take the standard deduction.
        </p>

        <h2>What Tips Qualify?</h2>
        <ul>
          <li>Cash tips or charged tips (credit/debit card)</li>
          <li>Tips must be voluntary and determined by the customer</li>
          <li>Tips cannot be negotiated or required in advance</li>
          <li>
            Tips must be earned in an occupation that customarily received tips
            before December 31, 2024
          </li>
        </ul>

        <p>
          <strong>Not qualified:</strong>
        </p>
        <ul>
          <li>Automatic gratuities</li>
          <li>Mandatory service charges</li>
        </ul>

        <p>
          Tips earned in a Specified Service Trade or Business (SSTB) do not
          qualify.
        </p>

        <h2>Deduction Limits & Income Rules</h2>
        <ul>
          <li>Up to $25,000 per return</li>
          <li>Available to itemizers and non-itemizers</li>
          <li>Not available if filing Married Filing Separately</li>
          <li>Phase-out begins at $150,000 (Single/HOH) and $300,000 (MFJ)</li>
        </ul>

        <h2>Employer Reporting for 2025</h2>
        <p>
          Employers are not required to separately report qualified tips on
          Forms W-2 or 1099 for 2025. Employers may provide a separate
          statement, but it is optional.
        </p>

        <p>
          <strong>Important:</strong> Taxpayers must keep their own tip records.
        </p>

        <h2>How to Prepare</h2>
        <ul>
          <li>Track daily cash and card tips</li>
          <li>Save POS summaries and pay stubs</li>
          <li>Separate voluntary tips from automatic gratuities</li>
          <li>Work with a qualified tax professional</li>
        </ul>

        <h2>Final Thoughts</h2>
        <p>
          This new deduction may lower taxable income for many tipped workers,
          but documentation is essential. Preparing now can help avoid issues
          during filing season.
        </p>

        <p className="text-xs text-muted-foreground">
          <strong>Source:</strong> IRS Notice 2025-69
        </p>
      </ArticleLayout>
    </>
  );
}
