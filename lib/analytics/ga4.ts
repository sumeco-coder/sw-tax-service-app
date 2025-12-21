// lib/analytics/ga4.ts
import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { unstable_cache } from "next/cache";

type GA4Overview = {
  users: number;
  sessions: number;
  events: number;
  // optional if you later enable it:
  conversions?: number;
};

type GA4UsersPoint = {
  date: string; // YYYYMMDD from GA4
  users: number;
};

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getPrivateKey() {
  // Support both raw multi-line keys and \n escaped keys
  const raw = env("GA4_PRIVATE_KEY");
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

const propertyId = env("GA4_PROPERTY_ID"); // numbers only (e.g. "123456789")

// Create the client once per server runtime instance
const client = new BetaAnalyticsDataClient({
  credentials: {
    client_email: env("GA4_CLIENT_EMAIL"),
    private_key: getPrivateKey(),
  },
});

/**
 * GA4 Overview (last 7 days)
 * Metrics: activeUsers, sessions, eventCount
 *
 * Cached for 15 minutes.
 */
export const ga4OverviewLast7Days = unstable_cache(
  async (): Promise<GA4Overview> => {
    try {
      const [res] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "eventCount" },

          // If you want conversions later, uncomment this AND ensure GA4 is tracking conversions.
          // { name: "conversions" },
        ],
      });

      const row = res.rows?.[0]?.metricValues ?? [];

      const users = Number(row[0]?.value ?? 0);
      const sessions = Number(row[1]?.value ?? 0);
      const events = Number(row[2]?.value ?? 0);

      // If conversions enabled above:
      // const conversions = Number(row[3]?.value ?? 0);

      return { users, sessions, events };
    } catch (e: any) {
      console.error(
        "GA4 Data API error (ga4OverviewLast7Days):",
        e?.message ?? e
      );
      throw e;
    }
  },
  ["ga4OverviewLast7Days"],
  { revalidate: 60 * 15 } // 15 minutes
);

/**
 * GA4 Users time series (last 14 days)
 * Dimension: date (YYYYMMDD)
 * Metric: activeUsers
 *
 * Cached for 1 hour.
 */
export const ga4UsersTimeseriesLast14Days = unstable_cache(
  async (): Promise<GA4UsersPoint[]> => {
    try {
      const [res] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "14daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });

      return (res.rows ?? []).map((r) => {
        const date = r.dimensionValues?.[0]?.value ?? "";
        const users = Number(r.metricValues?.[0]?.value ?? 0);
        return { date, users };
      });
    } catch (e: any) {
      console.error(
        "GA4 Data API error (ga4UsersTimeseriesLast14Days):",
        e?.message ?? e
      );
      throw e;
    }
  },
  ["ga4UsersTimeseriesLast14Days"],
  { revalidate: 60 * 60 } // 1 hour
);

/**
 * Helper: Format GA4 date (YYYYMMDD) → "Dec 21"
 * Use this in your UI if you want readable axis labels.
 */
export function formatGa4Date(yyyymmdd: string) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;

  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));

  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return yyyymmdd;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(dt);
}
