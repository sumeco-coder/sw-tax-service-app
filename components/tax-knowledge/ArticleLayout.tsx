// components/tax-knowledge/ArticleLayout.tsx
import Link from "next/link";
import { ReactNode } from "react";
import { TableOfContents } from "@/components/tax-knowledge/TableOfContents";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type ArticleLayoutProps = {
  title: string;
  subtitle?: string;
  badges?: string[];
  categoryHref?: string;
  categoryLabel?: string;
  children: ReactNode;
  viewCount?: number;
};

export function ArticleLayout({
  title,
  subtitle,
  badges = [],
  categoryHref = "/tax-knowledge",
  categoryLabel = "Tax Knowledge",
  children,
  viewCount, // ✅ FIXED
}: ArticleLayoutProps) {
  return (
    <main className="bg-secondary/40 py-12">
      {/* Breadcrumb */}
      <nav className="mx-auto mb-6 max-w-4xl text-sm text-muted-foreground">
        <Link href="/tax-knowledge" className="hover:underline">
          Tax Knowledge
        </Link>
        <span className="mx-1">/</span>
        <Link href={categoryHref} className="hover:underline">
          {categoryLabel}
        </Link>
        <span className="mx-1">/</span>
        <span className="font-medium text-foreground">{title}</span>
      </nav>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-[1fr_280px]">
        {/* Article */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="space-y-3">
            {(badges.length > 0 || typeof viewCount === "number") && (
              <div className="flex flex-wrap items-center gap-2">
                {badges.map((b) => (
                  <Badge key={b} variant="secondary">
                    {b}
                  </Badge>
                ))}

                {typeof viewCount === "number" && (
                  <Badge variant="outline" className="text-xs">
                    👀 {viewCount.toLocaleString()} views
                  </Badge>
                )}
              </div>
            )}

            <CardTitle className="text-3xl font-bold tracking-tight">
              {title}
            </CardTitle>

            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </CardHeader>

          <Separator />

          <CardContent className="space-y-8 pt-6 text-sm leading-relaxed">
            {children}
          </CardContent>
        </Card>

        {/* Table of Contents */}
        <TableOfContents />
      </div>
    </main>
  );
}
