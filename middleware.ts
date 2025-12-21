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

  const hasAny = KEYS.some((k) => url.searchParams.get(k));
  if (!hasAny) return res;

  // 30 days
  const maxAge = 60 * 60 * 24 * 30;

  for (const k of KEYS) {
    const v = url.searchParams.get(k);
    if (v) {
      res.cookies.set(k, v, {
        path: "/",
        maxAge,
        sameSite: "lax",
      });
    }
  }

  // extra useful context
  res.cookies.set("landing_path", url.pathname, { path: "/", maxAge, sameSite: "lax" });

  // NOTE: you cannot reliably read full referrer in middleware.
  // We'll capture referrer in the client form and submit it.

  return res;
}

// run on all pages except static assets
export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
