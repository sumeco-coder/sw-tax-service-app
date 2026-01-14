// app/(admin)/admin/(protected)/analytics/tax-knowledge/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import TaxKnowledgeDashboardClient from "../tax-knowledge/_components/TaxKnowledgeDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RangeKey = "7d" | "30d" | "all";

async function getBaseUrl() {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ??
    "localhost:3000";

  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  try {
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export default async function AdminTaxKnowledgeAnalyticsPage({
  searchParams,
}: {
  searchParams?: { range?: string };
}) {
  const range = (searchParams?.range as RangeKey) || "7d";
  const base = await getBaseUrl();

  // These are only for initial paint (client will refresh as needed).
  const [summaryRes, articlesRes] = await Promise.allSettled([
    fetch(`${base}/api/admin/analytics/tax-knowledge/summary?range=${range}`, {
      cache: "no-store",
    }),
    fetch(`${base}/api/admin/analytics/tax-knowledge/articles?range=${range}&limit=50`, {
      cache: "no-store",
    }),
  ]);

  const summary = await safeJson(
    summaryRes.status === "fulfilled" ? summaryRes.value : (new Response() as Response),
    {
      range,
      totalViews: 0,
      uniqueViews: 0,
      avgEngagedSeconds: 0,
      scroll75Rate: 0,
      topArticle: null as null | { slug: string; views: number },
    }
  );

  const articles = await safeJson(
    articlesRes.status === "fulfilled" ? articlesRes.value : (new Response() as Response),
    [] as Array<{
      slug: string;
      title?: string;
      category?: string;
      views: number;
      uniqueViews?: number;
      avgEngagedSeconds?: number;
      scroll75Rate?: number;
      updatedAt?: string;
    }>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/admin/analytics" className="hover:underline">
              Analytics
            </Link>{" "}
            <span className="mx-1">/</span>
            <span className="font-medium text-foreground">Tax Knowledge</span>
          </div>
          <h1 className="text-xl font-semibold text-[#202030]">Tax Knowledge Analytics</h1>
          <p className="mt-1 text-sm text-[#202030]/70">
            Article-level views, engagement, and scroll depth (powered by your tracking + DynamoDB).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/analytics"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-[#202030] hover:bg-muted"
          >
            View GA4 (Looker) →
          </Link>
        </div>
      </div>

      <TaxKnowledgeDashboardClient initialRange={range} initialSummary={summary} initialArticles={articles} />
    </div>
  );
}
