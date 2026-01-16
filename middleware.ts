// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

const AUTH_COOKIE_ID = "idToken";
const AUTH_COOKIE_ACCESS = "accessToken";

/* ─────────────────────────────────────────────
   Public UI routes (middleware must NEVER block)
───────────────────────────────────────────── */
const PUBLIC_UI_PATHS = new Set([
  "/admin/sign-in",
  "/admin/forgot-password",
  "/not-authorized",
  "/sign-in",
  "/sign-up",
  "/invite",
  "/invite/consume",
  "/taxpayer/onboarding-sign-up",
]);

/* ─────────────────────────────────────────────
   Public API routes (auth/webhooks/public)
───────────────────────────────────────────── */
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/stripe/webhook",
  "/api/stripe/checkout",
  "/api/stripe/create-checkout-session",
  "/api/stripe/confirm",
  "/api/public",
  "/api/tax-calculator",
];

/* ─────────────────────────────────────────────
   Client protected UI routes
───────────────────────────────────────────── */
const CLIENT_PROTECTED_PREFIXES = [
  "/appointments",
  "/dashboard",
  "/dependents",
  "/documents",
  "/files",
  "/invoices",
  "/messages",
  "/profile",
  "/questionnaire",
] as const;

function isClientProtectedPath(pathname: string) {
  return CLIENT_PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

/* ─────────────────────────────────────────────
   Roles
───────────────────────────────────────────── */
type AppRole =
  | "TAXPAYER"
  | "AGENCY"
  | "ADMIN"
  | "SUPERADMIN"
  | "LMS_PREPARER"
  | "LMS_ADMIN"
  | "TAX_PREPARER"
  | "SUPPORT_AGENT";

const APP_ROLES: readonly AppRole[] = [
  "TAXPAYER",
  "AGENCY",
  "ADMIN",
  "SUPERADMIN",
  "LMS_PREPARER",
  "LMS_ADMIN",
  "TAX_PREPARER",
  "SUPPORT_AGENT",
] as const;

function isAppRole(v: unknown): v is AppRole {
  return typeof v === "string" && APP_ROLES.includes(v as AppRole);
}

function resolveRole(customRoleRaw: unknown, groups: string[]): AppRole {
  // prefer custom role if it matches enum
  const role = String(customRoleRaw ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  if (isAppRole(role)) return role;

  // groups → role
  const g = groups.map((x) =>
    String(x).trim().toUpperCase().replace(/-/g, "_")
  );
  if (g.includes("SUPERADMIN")) return "SUPERADMIN";
  if (g.includes("ADMIN")) return "ADMIN";
  if (g.includes("SUPPORT_AGENT")) return "SUPPORT_AGENT";
  if (g.includes("LMS_ADMIN")) return "LMS_ADMIN";
  if (g.includes("LMS_PREPARER")) return "LMS_PREPARER";
  if (g.includes("TAX_PREPARER")) return "TAX_PREPARER";
  if (g.includes("AGENCY")) return "AGENCY";
  return "TAXPAYER";
}

/* ─────────────────────────────────────────────
   Read JWT payload from cookies
───────────────────────────────────────────── */
function safeDecode(token: string) {
  try {
    return decodeJwt(token) as Record<string, any>;
  } catch {
    return null;
  }
}

function getAuthPayload(req: NextRequest): Record<string, any> | null {
  const idToken = req.cookies.get(AUTH_COOKIE_ID)?.value ?? "";
  const accessToken = req.cookies.get(AUTH_COOKIE_ACCESS)?.value ?? "";

  const idPayload = idToken ? safeDecode(idToken) : null;
  const accessPayload = accessToken ? safeDecode(accessToken) : null;

  return idPayload ?? accessPayload ?? null;
}

function getGroups(payload: Record<string, any>): string[] {
  const g = payload["cognito:groups"];
  return Array.isArray(g) ? g.map((s) => String(s)) : [];
}

/* ─────────────────────────────────────────────
   UTM tracking keys (your existing logic)
───────────────────────────────────────────── */
const UTM_KEYS = [
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
  const pathname = url.pathname;

  // ✅ NEVER run middleware on Next.js internals/static assets
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // ✅ IMPORTANT: middleware must do NOTHING for onboarding
  if (pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

    // ✅ Tax calculator UI is public
  if (pathname === "/tax-calculator" || pathname.startsWith("/tax-calculator/")) {
    return NextResponse.next();
  }


  const isApi = pathname.startsWith("/api");
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  // ✅ Allow public UI always
  if (PUBLIC_UI_PATHS.has(pathname)) return NextResponse.next();

  // ✅ Allow public APIs always (auth/webhooks/etc)
  if (isApi && isPublicApi) return NextResponse.next();

  const payload = getAuthPayload(req);
  const groups = payload ? getGroups(payload) : [];
  const role = payload ? resolveRole(payload["custom:role"], groups) : null;

  const isAdmin =
    role === "ADMIN" ||
    role === "SUPERADMIN" ||
    groups.some((g) => {
      const x = String(g).toLowerCase();
      return x === "admin" || x === "superadmin";
    });

  // ✅ Client protected pages require auth
  const clientProtected = !isApi && isClientProtectedPath(pathname);
  if (clientProtected && !payload) {
    const next = pathname + (url.search || "");
    return NextResponse.redirect(
      new URL(`/sign-in?next=${encodeURIComponent(next)}`, req.url)
    );
  }

  // ✅ Admin routes require admin
  if (pathname.startsWith("/admin")) {
    if (!payload)
      return NextResponse.redirect(new URL("/admin/sign-in", req.url));
    if (!isAdmin)
      return NextResponse.redirect(new URL("/not-authorized", req.url));
    return NextResponse.next();
  }

  // ✅ Private APIs require auth; /api/admin requires admin
  if (isApi && !isPublicApi) {
    if (!payload)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (pathname.startsWith("/api/admin") && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.next();
  }

  // ✅ UTM tracking (never redirects)
  const res = NextResponse.next();
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24 * 30;

  const hasAny = UTM_KEYS.some((k) => url.searchParams.has(k));
  if (!hasAny) return res;

  for (const k of UTM_KEYS) {
    const v = url.searchParams.get(k);
    if (!v) continue;
    if (req.cookies.get(k)?.value) continue;

    res.cookies.set(k, encodeURIComponent(v), {
      path: "/",
      maxAge,
      sameSite: "lax",
      secure,
    });
  }

  if (!req.cookies.get("landing_path")?.value) {
    res.cookies.set("landing_path", pathname, {
      path: "/",
      maxAge,
      sameSite: "lax",
      secure,
    });
  }

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    // ✅ Catch-all but EXCLUDE onboarding so middleware does not run there
    "/((?!onboarding|_next|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
