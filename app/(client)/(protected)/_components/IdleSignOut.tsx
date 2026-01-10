// app/(client)/(protected)/_components/IdleSignOut.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";

type Props = {
  minutes?: number;
  redirectTo?: string; // ✅ allows admin redirect
};

export default function IdleSignOut({
  minutes = 20,
  redirectTo = "/sign-in?reason=timeout",
}: Props) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const ms = minutes * 60_000;

    const doLogout = async () => {
      try {
        // ✅ clear server auth cookies (SSR reads these)
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
        }).catch(() => {});

        // ✅ logs out across all devices (Amplify/Cognito)
        await signOut({ global: true });
      } catch {
        // fallback local signout
        try {
          await signOut();
        } catch {}
      } finally {
        router.replace(redirectTo);
        router.refresh(); // ✅ ensure server layouts re-read cookies
      }
    };

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(doLogout, ms);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) =>
      window.addEventListener(e, reset, { passive: true } as any)
    );

    const onVis = () => {
      if (document.visibilityState === "visible") reset();
    };
    document.addEventListener("visibilitychange", onVis);

    reset();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((e) =>
        window.removeEventListener(e, reset as any)
      );
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [minutes, redirectTo, router]);

  return null;
}
