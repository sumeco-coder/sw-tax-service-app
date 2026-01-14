"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
} from "recharts";

type RangeKey = "7d" | "30d" | "all";

type Summary = {
  range: RangeKey;
  totalViews: number;
  uniqueViews?: number;
  avgEngagedSeconds: number;
  scroll75Rate: number; // 0..1
  topArticle: null | { slug: string; views: number };
};

type ArticleRow = {
  slug: string;
  title?: string;
  category?: string;
  views: number;
  uniqueViews?: number;
  avgEngagedSeconds?: number;
  scroll75Rate?: number;
  updatedAt?: string;
};

type DailyPoint = {
  date: string; // YYYY-MM-DD
  views: number;
  uniqueViews?: number;
  avgEngagedSeconds?: number;
  scroll75Rate?: number;
};

function secToHuman(sec: number) {
  if (!sec || sec < 1) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function pct(v?: number) {
  if (typeof v !== "number") return "—";
  return `${Math.round(v * 100)}%`;
}

async function safeGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export default function TaxKnowledgeDashboardClient({
  initialRange,
  initialSummary,
  initialArticles,
}: {
  initialRange: RangeKey;
  initialSummary: Summary;
  initialArticles: ArticleRow[];
}) {
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [articles, setArticles] = useState<ArticleRow[]>(initialArticles);

  const [q, setQ] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialSummary?.topArticle?.slug ?? initialArticles?.[0]?.slug ?? null
  );
  const [series, setSeries] = useState<DailyPoint[] | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return articles;

    return articles.filter((a) => {
      const t = (a.title ?? "").toLowerCase();
      const s = a.slug.toLowerCase();
      const c = (a.category ?? "").toLowerCase();
      return t.includes(term) || s.includes(term) || c.includes(term);
    });
  }, [articles, q]);

  const selected = useMemo(() => {
    if (!selectedSlug) return null;
    return articles.find((a) => a.slug === selectedSlug) ?? null;
  }, [articles, selectedSlug]);

  // Load summary + list whenever range changes
  useEffect(() => {
    startTransition(async () => {
      const [s, list] = await Promise.all([
        safeGet<Summary>(`/api/admin/analytics/tax-knowledge/summary?range=${range}`, {
          range,
          totalViews: 0,
          uniqueViews: 0,
          avgEngagedSeconds: 0,
          scroll75Rate: 0,
          topArticle: null,
        }),
        safeGet<ArticleRow[]>(
          `/api/admin/analytics/tax-knowledge/articles?range=${range}&limit=50`,
          []
        ),
      ]);

      setSummary(s);
      setArticles(list);

      // keep selection sensible
      if (list.length > 0) {
        const stillExists = selectedSlug && list.some((x) => x.slug === selectedSlug);
        if (!stillExists) {
          setSelectedSlug(s.topArticle?.slug ?? list[0].slug);
        }
      } else {
        setSelectedSlug(null);
        setSeries(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Load series whenever selectedSlug changes
  useEffect(() => {
    if (!selectedSlug) return;

    (async () => {
      setIsLoadingSeries(true);
      const data = await safeGet<DailyPoint[]>(
        `/api/admin/analytics/tax-knowledge/article?slug=${encodeURIComponent(
          selectedSlug
        )}&range=${range === "all" ? "30d" : range}`,
        []
      );
      setSeries(data);
      setIsLoadingSeries(false);
    })();
  }, [selectedSlug, range]);

  const kpiCards = (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Total views</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold text-[#202030]">
          {summary.totalViews.toLocaleString()}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Unique views</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold text-[#202030]">
          {(summary.uniqueViews ?? 0).toLocaleString()}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Avg engaged time</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold text-[#202030]">
          {secToHuman(summary.avgEngagedSeconds)}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Scroll 75% rate</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold text-[#202030]">
          {pct(summary.scroll75Rate)}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Range Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <TabsList className="rounded-2xl">
            <TabsTrigger value="7d" className="rounded-xl">
              7 days
            </TabsTrigger>
            <TabsTrigger value="30d" className="rounded-xl">
              30 days
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-xl">
              All time
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex w-full gap-2 sm:w-[420px]">
          <Input
            placeholder="Search articles (title, slug, category)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-2xl"
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => {
              // force reload without changing range
              startTransition(async () => {
                const [s, list] = await Promise.all([
                  safeGet<Summary>(`/api/admin/analytics/tax-knowledge/summary?range=${range}`, summary),
                  safeGet<ArticleRow[]>(
                    `/api/admin/analytics/tax-knowledge/articles?range=${range}&limit=50`,
                    articles
                  ),
                ]);
                setSummary(s);
                setArticles(list);
              });
            }}
            disabled={isPending}
          >
            {isPending ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {kpiCards}

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        {/* Leaderboard */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold text-[#202030]">Top articles</CardTitle>

              <div className="flex items-center gap-2">
                {summary.topArticle?.slug ? (
                  <Badge variant="secondary" className="rounded-xl">
                    Top: {summary.topArticle.slug}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-xl">
                    No data yet
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Click an article to see daily trend + engagement details.
            </p>
          </CardHeader>

          <Separator />

          <CardContent className="pt-4">
            {isPending && articles.length === 0 ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-2xl" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead className="w-[120px] text-right">Views</TableHead>
                      <TableHead className="w-[160px] text-right">Avg time</TableHead>
                      <TableHead className="w-[140px] text-right">Scroll 75%</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((a) => {
                      const active = a.slug === selectedSlug;
                      return (
                        <TableRow
                          key={a.slug}
                          className={`cursor-pointer ${active ? "bg-muted/60" : ""}`}
                          onClick={() => setSelectedSlug(a.slug)}
                        >
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-semibold text-[#202030]">
                                  {a.title ?? a.slug}
                                </div>
                                {a.category ? (
                                  <Badge variant="secondary" className="rounded-xl text-xs">
                                    {a.category}
                                  </Badge>
                                ) : null}
                              </div>

                              <div className="text-xs text-muted-foreground">{a.slug}</div>

                              <div className="pt-1">
                                <Link
                                  href={`/tax-knowledge/${a.slug}`}
                                  className="text-xs font-semibold text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Open article →
                                </Link>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-semibold">
                            {a.views.toLocaleString()}
                          </TableCell>

                          <TableCell className="text-right">
                            {secToHuman(a.avgEngagedSeconds ?? 0)}
                          </TableCell>

                          <TableCell className="text-right">{pct(a.scroll75Rate)}</TableCell>
                        </TableRow>
                      );
                    })}

                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                          No matches.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-semibold text-[#202030]">Article details</CardTitle>

            {selected ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-xl">
                  {selected.category ?? "Tax Knowledge"}
                </Badge>
                <Badge variant="outline" className="rounded-xl">
                  {range.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="rounded-xl">
                  👀 {selected.views.toLocaleString()} views
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select an article to view details.</p>
            )}
          </CardHeader>

          <Separator />

          <CardContent className="space-y-5 pt-4">
            {!selected ? (
              <div className="rounded-2xl border bg-secondary/40 p-4 text-sm text-muted-foreground">
                No article selected.
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[#202030]">
                    {selected.title ?? selected.slug}
                  </div>
                  <div className="text-xs text-muted-foreground">{selected.slug}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border bg-secondary/40 p-4">
                    <div className="text-xs font-semibold text-muted-foreground">Views</div>
                    <div className="mt-1 text-xl font-bold text-[#202030]">{selected.views.toLocaleString()}</div>
                  </div>

                  <div className="rounded-2xl border bg-secondary/40 p-4">
                    <div className="text-xs font-semibold text-muted-foreground">Avg time</div>
                    <div className="mt-1 text-xl font-bold text-[#202030]">
                      {secToHuman(selected.avgEngagedSeconds ?? 0)}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-secondary/40 p-4">
                    <div className="text-xs font-semibold text-muted-foreground">Scroll 75%</div>
                    <div className="mt-1 text-xl font-bold text-[#202030]">
                      {pct(selected.scroll75Rate)}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-secondary/40 p-4">
                    <div className="text-xs font-semibold text-muted-foreground">Updated</div>
                    <div className="mt-1 text-sm font-semibold text-[#202030]">
                      {selected.updatedAt ? format(new Date(selected.updatedAt), "MMM d, yyyy") : "—"}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#202030]">Daily trend</div>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      size="sm"
                      onClick={async () => {
                        if (!selectedSlug) return;
                        setIsLoadingSeries(true);
                        const data = await safeGet<DailyPoint[]>(
                          `/api/admin/analytics/tax-knowledge/article?slug=${encodeURIComponent(
                            selectedSlug
                          )}&range=${range === "all" ? "30d" : range}`,
                          []
                        );
                        setSeries(data);
                        setIsLoadingSeries(false);
                      }}
                      disabled={isLoadingSeries}
                    >
                      {isLoadingSeries ? "Loading…" : "Reload"}
                    </Button>
                  </div>

                  {isLoadingSeries && !series ? (
                    <Skeleton className="h-[220px] w-full rounded-2xl" />
                  ) : (
                    <div className="h-[240px] overflow-hidden rounded-2xl border bg-white">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series ?? []} margin={{ top: 16, right: 18, bottom: 8, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(v) => {
                              try {
                                return format(new Date(v), "MMM d");
                              } catch {
                                return v;
                              }
                            }}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <ReTooltip />
                          <Line type="monotone" dataKey="views" stroke="currentColor" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Tip: “All time” uses a 30-day chart window for readability. (You can change this later.)
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
