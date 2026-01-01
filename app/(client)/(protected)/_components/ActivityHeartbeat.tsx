// app/(client)/(ptotected)/_components/ActivityHeartbeat.tsx
"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth";

export function ActivityHeartbeat() {
  const pathname = usePathname();

  const heartbeat = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      const token =
        session.tokens?.idToken?.toString() ||
        session.tokens?.accessToken?.toString();

      await fetch("/api/heartbeat", {
        method: "POST",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      // ignore
    }
  }, []);

  // ping on route change
  useEffect(() => {
    heartbeat();
  }, [pathname, heartbeat]);

  // ping every 60s + on focus/visibility
  useEffect(() => {
    const id = setInterval(heartbeat, 60_000);
    const onVis = () => document.visibilityState === "visible" && heartbeat();

    window.addEventListener("focus", heartbeat);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", heartbeat);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [heartbeat]);

  return null;
}
