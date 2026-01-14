"use client";

import { usePageAnalytics } from "./usePageAnalytics";

export function PageTracker({
  slug,
  title,
  category,
}: {
  slug: string;
  title: string;
  category?: string;
}) {
  usePageAnalytics({ slug, title, category });
  return null;
}
