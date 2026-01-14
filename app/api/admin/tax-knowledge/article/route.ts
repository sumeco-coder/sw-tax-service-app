import { NextResponse } from "next/server";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws/dynamodb";
import { getServerRole } from "@/lib/auth/roleServer";

const TABLE = process.env.ANALYTICS_TABLE_NAME ?? "ArticleAnalytics";

function isAdminRole(role: unknown) {
  return String(role ?? "").toLowerCase() === "admin";
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBack(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return d;
}

export async function GET(req: Request) {
  const me = await getServerRole();
  if (!me?.sub || !isAdminRole(me.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const range = (searchParams.get("range") ?? "7d") as "7d" | "30d" | "all";

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const pk = `VIEW#${slug}`;

  // Chart window
  const days =
    range === "7d" ? 7 :
    range === "30d" ? 30 :
    30; // "all" -> keep 30d window for readability

  const from = `DAY#${isoDate(daysBack(days))}`;
  const to = `DAY#${isoDate(new Date())}`;

  // ✅ If you later store daily items like:
  // { pk: "VIEW#slug", sk: "DAY#2026-01-13", views: 12, avgEngagedSeconds: 90, scroll75Rate: 0.7 }
  const q = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "#pk = :pk AND #sk BETWEEN :from AND :to",
      ExpressionAttributeNames: { "#pk": "pk", "#sk": "sk" },
      ExpressionAttributeValues: { ":pk": pk, ":from": from, ":to": to },
      ScanIndexForward: true,
    })
  );

  const daily = (q.Items ?? []) as Array<{
    pk: string;
    sk: string; // DAY#YYYY-MM-DD
    views?: number;
    uniqueViews?: number;
    avgEngagedSeconds?: number;
    scroll75Rate?: number;
  }>;

  if (daily.length > 0) {
    return NextResponse.json(
      daily.map((it) => ({
        date: it.sk.replace(/^DAY#/, ""),
        views: Number(it.views ?? 0),
        uniqueViews: Number(it.uniqueViews ?? it.views ?? 0),
        avgEngagedSeconds: Number(it.avgEngagedSeconds ?? 0),
        scroll75Rate: typeof it.scroll75Rate === "number" ? it.scroll75Rate : 0,
      }))
    );
  }

  // Fallback: no daily data yet — return a single point using total counter
  const total = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { pk, sk: "count" },
    })
  );

  const count = Number((total.Item as any)?.count ?? 0);

  return NextResponse.json([
    {
      date: isoDate(new Date()),
      views: count,
      uniqueViews: count,
      avgEngagedSeconds: 0,
      scroll75Rate: 0,
    },
  ]);
}
