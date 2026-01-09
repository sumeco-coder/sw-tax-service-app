// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

const AUTH_COOKIE = "idToken";

/* =======================
   ONBOARDING STEPS (ORDER)
======================= */
const ONBOARDING_STEPS = [
  "PROFILE",
  "DOCUMENTS",
  "QUESTIONS",
  "SCHEDULE",
  "SUMMARY",
  "AGREEMENTS",
  "SUBMITTED",
  "DONE",
] as const;

/* =======================
   PUBLIC API ROUTES
======================= */
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/webhooks",
  "/api/public",
];

/* =======================
   UI ROUTES ALLOWED
   BEFORE ONBOARDING DONE
======================= */
const ONBOARDING_ALLOWED_UI = [
  "/onboarding",
  "/sign-in",
  "/sign-up",
  "/logout",
];

/* =======================
   UTM TRACKING KEYS
======================= */
const KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

/* =======================
   HELPERS
======================= */
function stepFromPath(pathname: string) {
  const seg = pathname.split("/")[2];
  return seg ? seg.toUpperCase() : null;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  const isApi = pathname.startsWith("/api");
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );

  /* =======================
     🔐 API AUTH ENFORCEMENT
  ======================= */
  if (isApi && !isPublicApi) {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: Record<string, any>;
    try {
      decoded = decodeJwt(token);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = String(decoded["custom:role"] ?? "").toLowerCase();
    const step = String(decoded["custom:onboardingStep"] ?? "PROFILE").toUpperCase();
    const onboardingComplete = step === "DONE";

    // 🔒 Admin API requires admin
    if (pathname.startsWith("/api/admin")) {
      if (role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // 🚧 Block client APIs until onboarding DONE (admins bypass)
    if (
      role !== "admin" &&
      !onboardingComplete &&
      !pathname.startsWith("/api/onboarding")
    ) {
      return NextResponse.json(
        { error: "Onboarding incomplete" },
        { status: 403 }
      );
    }
  }

  /* =======================
     🔐 ADMIN UI ROUTES
  ======================= */
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.redirect(
        new URL("/admin/sign-in", req.url)
      );
    }

    const decoded = decodeJwt(token);
    const role = String(decoded["custom:role"] ?? "").toLowerCase();

    if (role !== "admin") {
      return NextResponse.redirect(
        new URL("/not-authorized", req.url)
      );
    }
  }

  /* =======================
     🚧 STEP-BY-STEP ONBOARDING UI
  ======================= */
  if (!isApi && !pathname.startsWith("/admin")) {
    const token = req.cookies.get(AUTH_COOKIE)?.value;

    if (token) {
      const decoded = decodeJwt(token);
      const role = String(decoded["custom:role"] ?? "").toLowerCase();

      // Admin bypass
      if (role !== "admin") {
        const step = String(
          decoded["custom:onboardingStep"] ?? "PROFILE"
        ).toUpperCase();

        const currentIndex = ONBOARDING_STEPS.indexOf(step as any);
        const isDone = step === "DONE";

        // 🚫 Block app access until DONE
        if (!isDone && !pathname.startsWith("/onboarding")) {
          return NextResponse.redirect(
            new URL(`/onboarding/${step.toLowerCase()}`, req.url)
          );
        }

        // 🚧 Enforce step order inside onboarding
        if (pathname.startsWith("/onboarding")) {
          const requestedStep = stepFromPath(pathname);
          const allowedIndex = currentIndex;

          const requestedIndex = requestedStep
            ? ONBOARDING_STEPS.indexOf(requestedStep as any)
            : -1;

          if (
            requestedIndex === -1 ||
            requestedIndex > allowedIndex
          ) {
            return NextResponse.redirect(
              new URL(`/onboarding/${step.toLowerCase()}`, req.url)
            );
          }
        }
      }
    }
  }

  /* =======================
     📊 UTM TRACKING
  ======================= */
  const res = NextResponse.next();
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24 * 30;

  const hasAny = KEYS.some((k) => url.searchParams.has(k));
  if (!hasAny) return res;

  for (const k of KEYS) {
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

/* =======================
   MATCHER
======================= */
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
