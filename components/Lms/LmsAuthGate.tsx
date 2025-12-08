// components/lms/LmsAuthGate.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClientRole } from "@/lib/auth/roleClient";

type Props = {
  children: React.ReactNode;
};

export function LmsAuthGate({ children }: Props) {
  const [state, setState] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const info = await getClientRole();

      if (!info) {
        setState("denied");
        router.replace("/sign-in?from=lms");
        return;
      }

      const { role } = info;

      const isLmsRole =
        role === "lms-preparer" || role === "lms-admin" || role === "admin";

      if (isLmsRole) {
        setState("allowed");
      } else {
        setState("denied");
        // send taxpayers back to their side
        router.replace("/sign-in?from=lms");
      }
    }

    run();
  }, [router]);

  if (state === "checking") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-200">
        Checking your LMS access…
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-center text-sm text-slate-200">
        You don’t have access to the LMS area. Try signing in with an LMS
        account or contact your admin.
      </div>
    );
  }

  return <>{children}</>;
}
