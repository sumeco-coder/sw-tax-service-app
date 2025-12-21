// lib/analytics/clarity.ts
import "server-only";

export type ClarityOverview = {
  sessions: number;
  rageClicks: number;
  deadClicks: number;
};

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * Calls Clarity "project-live-insights" export endpoint.
 * Note: API is limited to 10 calls/project/day, so keep this cached on your side.
 */
export async function clarityOverviewLast7Days(): Promise<ClarityOverview> {
  const token = env("CLARITY_API_TOKEN");
  const projectId = env("CLARITY_PROJECT_ID");

  const url = new URL("https://www.clarity.ms/export-data/api/v1/project-live-insights");
  url.searchParams.set("projectId", projectId);

  // Some Clarity exports allow "numDays" or date range. If yours supports it, uncomment:
  // url.searchParams.set("numDays", "7");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Clarity API failed: ${res.status} ${res.statusText} ${text}`);
  }

  const data: any = await res.json();

  /**
   * Clarity response shape can vary. We'll map defensively.
   * Common fields often look like:
   * data.sessions, data.rageClicks, data.deadClicks
   * or nested under "insights" / "metrics".
   */
  const sessions =
    Number(data?.sessions ?? data?.metrics?.sessions ?? data?.insights?.sessions ?? 0);

  const rageClicks =
    Number(data?.rageClicks ?? data?.metrics?.rageClicks ?? data?.insights?.rageClicks ?? 0);

  const deadClicks =
    Number(data?.deadClicks ?? data?.metrics?.deadClicks ?? data?.insights?.deadClicks ?? 0);

  return { sessions, rageClicks, deadClicks };
}
