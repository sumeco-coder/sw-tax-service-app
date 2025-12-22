// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const res = NextResponse.next();

  const secure = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24 * 30; // 30 days

  // Only act if at least one tracking param exists
  const hasAny = KEYS.some((k) => url.searchParams.has(k));
  if (!hasAny) return res;

  // ✅ Set param cookies (first-touch: don't overwrite if already set)
  for (const k of KEYS) {
    const v = url.searchParams.get(k);
    if (!v) continue;

    const already = req.cookies.get(k)?.value;
    if (already) continue; // keep first-touch attribution

    res.cookies.set(k, encodeURIComponent(v), {
      path: "/",
      maxAge,
      sameSite: "lax",
      secure,
    });
  }

  // ✅ Landing path (first-touch)
  const hasLanding = req.cookies.get("landing_path")?.value;
  if (!hasLanding) {
    res.cookies.set("landing_path", url.pathname, {
      path: "/",
      maxAge,
      sameSite: "lax",
      secure,
    });
  }

  return res;
}

// ✅ Run on all pages except API + static assets
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
