// components/Lms/LmsAuthGate.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { getClientRole } from "@/lib/auth/roleClient";

type Props = { children: React.ReactNode };

const ALLOWED_LMS_ROLES = new Set([
  "LMS_PREPARER",
  "LMS_ADMIN",
  "ADMIN",
  "SUPERADMIN",
]);

const ADMIN_LMS_ROLES = new Set(["LMS_ADMIN", "ADMIN", "SUPERADMIN"]);

const ADMIN_HOME = "/lms/admin/dashboard";
const LEARN_HOME = "/lms/learn/dashboard";

function isLmsRoot(pathname: string) {
  return pathname === "/lms/dashboard" || pathname === "/lms";
}

export function LmsAuthGate({ children }: Props) {
  const [state, setState] = useState<"checking" | "allowed" | "denied">(
    "checking"
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const info = await getClientRole();

      const next =
        pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      const signInUrl = `/sign-in?next=${encodeURIComponent(next)}&from=lms`;

      if (!info) {
        if (!cancelled) setState("denied");
        router.replace(signInUrl);
        return;
      }

      const role = info.role;

      // Not an LMS role at all → block
      if (!ALLOWED_LMS_ROLES.has(role)) {
        if (!cancelled) setState("denied");
        router.replace("/not-authorized");
        return;
      }

      const isAdmin = ADMIN_LMS_ROLES.has(role);

      // If they hit a generic LMS root, send to correct dashboard
      if (isLmsRoot(pathname)) {
        router.replace(isAdmin ? ADMIN_HOME : LEARN_HOME);
        return;
      }

      // Block learner from admin area
      if (!isAdmin && pathname.startsWith("/lms/admin")) {
        if (!cancelled) setState("denied");
        router.replace("/not-authorized");
        return;
      }

      // Keep admins out of learner area (optional, but recommended)
      if (isAdmin && pathname.startsWith("/lms/learn")) {
        router.replace(ADMIN_HOME);
        return;
      }

      if (!cancelled) setState("allowed");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, pathname, searchParams]);

  if (state === "checking") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Checking your LMS access…
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-center text-sm text-muted-foreground">
        You don’t have access to the LMS area. Try signing in with an LMS account
        or contact your admin.
      </div>
    );
  }

  return <>{children}</>;
}
