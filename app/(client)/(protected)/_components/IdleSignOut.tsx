// app/(client)/(protected)/_components/IdleSignOut.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";

export default function IdleSignOut({ minutes = 20 }: { minutes?: number }) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const ms = minutes * 60_000;

    const doLogout = async () => {
      try {
        // ✅ logs out across all devices
        await signOut({ global: true });
      } catch {
        // even if global signout fails (offline), still redirect
        try {
          await signOut(); // fallback local
        } catch {}
      } finally {
        router.replace("/sign-in?reason=timeout");
      }
    };

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(doLogout, ms);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    const onVis = () => {
      if (document.visibilityState === "visible") reset();
    };
    document.addEventListener("visibilitychange", onVis);

    reset();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset as any));
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [minutes, router]);

  return null;
}
