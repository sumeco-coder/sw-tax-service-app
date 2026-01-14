"use client";

import { usePathname } from "next/navigation";
import { usePageAnalytics } from "./usePageAnalytics";

export function TaxKnowledgeTracker() {
  const pathname = usePathname();

  // Only track tax-knowledge routes
  if (!pathname.startsWith("/tax-knowledge")) {
    return null;
  }

  const slug = pathname
    .replace("/tax-knowledge/", "")
    .replaceAll("/", "-");

  const title = slug
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  usePageAnalytics({
    slug,
    title,
    category: "Tax Knowledge",
  });

  return null;
}
