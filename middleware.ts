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
]);

/* ─────────────────────────────────────────────
   Public API routes (webhooks/auth/public)
───────────────────────────────────────────── */
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/stripe/webhook", "/api/public"];

/* ─────────────────────────────────────────────
   Onboarding steps + route mapping (YOUR ROUTES)
───────────────────────────────────────────── */
const ONBOARDING_ORDER = [
  "PROFILE",
  "DOCUMENTS",
  "QUESTIONS",
  "SCHEDULE",
  "SUMMARY",
  "AGREEMENTS",
  "SUBMITTED",
  "DONE",
] as const;

const STEP_TO_PATH: Record<(typeof ONBOARDING_ORDER)[number], string> = {
  PROFILE: "/onboarding/profile",
  DOCUMENTS: "/onboarding/documents",
  QUESTIONS: "/onboarding/questions",
  SCHEDULE: "/onboarding/schedule",
  SUMMARY: "/onboarding/summary",
  AGREEMENTS: "/onboarding/agreements",
  SUBMITTED: "/onboarding/submitted",
  DONE: "/onboarding/complete", // ✅ your actual final route
};

/* ─────────────────────────────────────────────
   Client protected UI routes (REAL URL paths)
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
   App roles (match your DB enum exactly)
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
  // 1) Prefer explicit custom role IF it matches AppRole (uppercase enum)
  if (isAppRole(customRoleRaw)) return customRoleRaw;

  // 2) Map Cognito groups → AppRole (lowercase group names)
  if (groups.includes("superadmin")) return "SUPERADMIN";
  if (groups.includes("admin")) return "ADMIN";
  if (groups.includes("support-agent")) return "SUPPORT_AGENT";
  if (groups.includes("lms-admin")) return "LMS_ADMIN";
  if (groups.includes("lms-preparer")) return "LMS_PREPARER";
  if (groups.includes("tax-preparer")) return "TAX_PREPARER";
  if (groups.includes("agency")) return "AGENCY";
  if (groups.includes("taxpayer")) return "TAXPAYER";

  // 3) Safe default
  return "TAXPAYER";
}

/* ─────────────────────────────────────────────
   Read JWT payload from cookies (idToken first, fallback to accessToken)
   Also prefers whichever token actually contains groups.
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

  // Prefer payload that has cognito:groups, otherwise prefer idPayload, fallback accessPayload
  const idGroups = (idPayload?.["cognito:groups"] as string[] | undefined) ?? [];
  const accessGroups =
    (accessPayload?.["cognito:groups"] as string[] | undefined) ?? [];

  if (idPayload && idGroups.length) return idPayload;
  if (accessPayload && accessGroups.length) return accessPayload;

  return idPayload ?? accessPayload ?? null;
}

function getGroups(payload: Record<string, any>): string[] {
  const g = payload["cognito:groups"];
  return Array.isArray(g) ? g.map((s) => String(s).toLowerCase()) : [];
}

function getOnboardingStep(payload: Record<string, any>) {
  const raw = String(payload["custom:onboardingStep"] ?? "PROFILE").toUpperCase();
  return (ONBOARDING_ORDER.includes(raw as any) ? raw : "PROFILE") as
    | (typeof ONBOARDING_ORDER)[number];
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

  const isApi = pathname.startsWith("/api");
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  // ✅ Allow public UI always
  if (PUBLIC_UI_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // ✅ Allow public APIs always (auth/webhooks/etc)
  if (isApi && isPublicApi) {
    return NextResponse.next();
  }

  // Pull payload once (server authority)
  const payload = getAuthPayload(req);
  const groups = payload ? getGroups(payload) : [];
  const role = payload ? resolveRole(payload["custom:role"], groups) : null;

  const isAdmin = role === "ADMIN" || role === "SUPERADMIN" || groups.includes("admin") || groups.includes("superadmin");

  const clientProtected = !isApi && isClientProtectedPath(pathname);

  /* =====================================================
     🔐 0) CLIENT PAGES — REQUIRE AUTH (middleware protection)
  ===================================================== */
  if (clientProtected && !payload) {
    const next = pathname + (url.search || "");
    return NextResponse.redirect(
      new URL(`/sign-in?next=${encodeURIComponent(next)}`, req.url)
    );
  }

  /* =====================================================
     🔐 1) ADMIN ROUTES (ALIGNMENT: TRUST GROUPS)
     IMPORTANT: /admin/sign-in is already public above
  ===================================================== */
  if (pathname.startsWith("/admin")) {
    // Not signed in → admin sign-in
    if (!payload) {
      return NextResponse.redirect(new URL("/admin/sign-in", req.url));
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/not-authorized", req.url));
    }

    return NextResponse.next();
  }

  /* =====================================================
     🔐 2) API AUTH (block private APIs)
  ===================================================== */
  if (isApi && !isPublicApi) {
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin APIs must be admin group
    if (pathname.startsWith("/api/admin")) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.next();
    }

    // Client APIs blocked until onboarding DONE (admins bypass)
    const step = getOnboardingStep(payload);
    const onboardingDone = step === "DONE";

    if (!isAdmin && !onboardingDone && !pathname.startsWith("/api/onboarding")) {
      return NextResponse.json({ error: "Onboarding incomplete" }, { status: 403 });
    }

    return NextResponse.next();
  }

  /* =====================================================
     🔐 3) PROTECT ONBOARDING ROUTES (require auth)
  ===================================================== */
  if (pathname.startsWith("/onboarding")) {
    if (!payload) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

   /* =====================================================
     🚧 4) CLIENT UI — STEP-BY-STEP ONBOARDING
     (Admins bypass completely)
     IMPORTANT CHANGE: only force onboarding when user
     tries to access CLIENT PROTECTED pages.
  ===================================================== */
  if (!isApi && payload && !isAdmin) {
    const step = getOnboardingStep(payload);
    const onboardingDone = step === "DONE";

    const targetPath = STEP_TO_PATH[step];

    // Block non-onboarding pages until DONE
    if (!onboardingDone && !pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL(targetPath, req.url));
    }

    // Enforce step order inside onboarding
    if (!onboardingDone && pathname.startsWith("/onboarding")) {
      // requested step is the 2nd segment: /onboarding/{step}
      const requested = (pathname.split("/")[2] ?? "").toUpperCase();

      // map requested route segment -> step key
      const requestedStep = (Object.keys(STEP_TO_PATH) as Array<
        keyof typeof STEP_TO_PATH
      >).find((k) => STEP_TO_PATH[k].split("/")[2]?.toUpperCase() === requested);

      const currentIndex = ONBOARDING_ORDER.indexOf(step);
      const requestedIndex = requestedStep ? ONBOARDING_ORDER.indexOf(requestedStep) : -1;

      // If unknown or ahead of current step, redirect back to current step
      if (requestedIndex === -1 || requestedIndex > currentIndex) {
        return NextResponse.redirect(new URL(targetPath, req.url));
      }
    }
  }

  /* =====================================================
     📊 5) UTM TRACKING (LAST — NEVER REDIRECTS)
  ===================================================== */
  const res = NextResponse.next();
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24 * 30; // 30 days

  const hasAny = UTM_KEYS.some((k) => url.searchParams.has(k));
  if (!hasAny) return res;

  for (const k of UTM_KEYS) {
    const v = url.searchParams.get(k);
    if (!v) continue;

    const already = req.cookies.get(k)?.value;
    if (already) continue;

    res.cookies.set(k, encodeURIComponent(v), {
      path: "/",
      maxAge,
      sameSite: "lax",
      secure,
    });
  }

  const hasLanding = req.cookies.get("landing_path")?.value;
  if (!hasLanding) {
    res.cookies.set("landing_path", pathname, {
      path: "/",
      maxAge,
      sameSite: "lax",
      secure,
    });
  }

  return res;
}

/* =======================
   MATCHER
======================= */
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/onboarding/:path*",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
