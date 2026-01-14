// lib/analytics/getArticleViews.ts
import "server-only";
import { headers } from "next/headers";

async function getBaseUrl() {
  // ✅ Next 15+: headers() is async
  const h = await headers();

  // Prefer explicit env if you have it (works in SSR + background/server contexts)
  const envBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envBase) return envBase;

  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    "localhost:3000";

  const proto =
    h.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

export async function getArticleViews(slug: string): Promise<number> {
  if (!slug) return 0;

  try {
    const base = await getBaseUrl();

    const res = await fetch(
      `${base}/api/analytics/view?slug=${encodeURIComponent(slug)}`,
      { cache: "no-store" }
    );

    if (!res.ok) return 0;

    const data = await res.json().catch(() => null);
    return typeof data?.views === "number" ? data.views : 0;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] view fetch error:", err);
    }
    return 0;
  }
}
