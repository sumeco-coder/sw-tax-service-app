"use client";

import { useEffect, useRef } from "react";

type PageAnalyticsProps = {
  slug: string;
  title: string;
  category?: string;
};

export function usePageAnalytics({ slug, title, category }: PageAnalyticsProps) {
  const scrollTracked = useRef(false);
  const activeStart = useRef<number | null>(null);
  const totalActiveTime = useRef(0);
  const viewSent = useRef(false);
  const flushed = useRef(false); // prevents double flush

  // Helpers
  const sendJson = (url: string, data: unknown) => {
    const body = JSON.stringify(data);

    // ✅ best for unload (doesn't block navigation)
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      try {
        const blob = new Blob([body], { type: "application/json" });
        (navigator as any).sendBeacon(url, blob);
        return;
      } catch {
        // fall back
      }
    }

    // ✅ keepalive allows request during navigation/unload in modern browsers
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  };

  // PAGE VIEW + ACTIVE TIME
  useEffect(() => {
    flushed.current = false;

    // 🔒 ensure view fires once per slug
    if (!viewSent.current) {
      viewSent.current = true;

      window.dispatchEvent(
        new CustomEvent("page:view", {
          detail: { slug, title, category },
        })
      );

      // View endpoint (unique human dedupe happens server-side)
      fetch("/api/analytics/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      }).catch(() => {});
    }

    // Start active timer
    activeStart.current = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (activeStart.current) {
          totalActiveTime.current += Date.now() - activeStart.current;
          activeStart.current = null;
        }
      } else {
        activeStart.current = Date.now();
      }
    };

    const flushEngagement = () => {
      if (flushed.current) return;
      flushed.current = true;

      if (activeStart.current) {
        totalActiveTime.current += Date.now() - activeStart.current;
        activeStart.current = null;
      }

      const durationSeconds = Math.round(totalActiveTime.current / 1000);

      if (durationSeconds > 0) {
        window.dispatchEvent(
          new CustomEvent("page:engagement", {
            detail: { slug, duration: durationSeconds },
          })
        );

        // ✅ send to server (deduped per day per visitor)
        sendJson("/api/analytics/engagement", {
          slug,
          duration: durationSeconds,
        });
      }

      // reset for next page (BUT do NOT reset viewSent here)
      totalActiveTime.current = 0;
      scrollTracked.current = false;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", flushEngagement);

    return () => {
      // 🔥 flush on route change
      flushEngagement();

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", flushEngagement);

      // ✅ allow next page to send its own view
      viewSent.current = false;
    };
  }, [slug, title, category]);

  // SCROLL DEPTH (75%)
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTracked.current) return;

      const scrollPercent =
        (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;

      if (scrollPercent >= 0.75) {
        scrollTracked.current = true;

        window.dispatchEvent(
          new CustomEvent("page:scroll", {
            detail: { slug, depth: "75%" },
          })
        );

        // ✅ send to server (deduped per day per visitor)
        fetch("/api/analytics/scroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, depth: "75%" }),
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [slug]);
}
