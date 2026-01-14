import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws/dynamodb";
import { getServerRole } from "@/lib/auth/roleServer";

const TABLE = process.env.ANALYTICS_TABLE_NAME ?? "ArticleAnalytics";

function isAdminRole(role: unknown) {
  return String(role ?? "").toLowerCase() === "admin";
}

export async function GET(req: Request) {
  const me = await getServerRole();
  if (!me?.sub || !isAdminRole(me.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "7d") as "7d" | "30d" | "all";

  // ✅ Current schema: pk = "VIEW#<slug>", sk="count", count=<number>
  const scan = await ddb.send(
    new ScanCommand({
      TableName: TABLE,
      ProjectionExpression: "#pk, #sk, #count",
      FilterExpression:
        "begins_with(#pk, :viewPrefix) AND #sk = :countSk",
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#sk": "sk",
        "#count": "count",
      },
      ExpressionAttributeValues: {
        ":viewPrefix": "VIEW#",
        ":countSk": "count",
      },
    })
  );

  const items = (scan.Items ?? []) as Array<{
    pk: string;
    sk: string;
    count?: number;
  }>;

  let totalViews = 0;
  let topSlug: string | null = null;
  let topViews = 0;

  for (const it of items) {
    const views = Number(it.count ?? 0);
    totalViews += views;

    if (views > topViews) {
      topViews = views;
      topSlug = it.pk.replace(/^VIEW#/, "");
    }
  }

  // ⚠️ If you haven’t implemented engagement/scroll server writes yet,
  // keep these as 0 for now (dashboard will still work).
  const avgEngagedSeconds = 0;
  const scroll75Rate = 0;

  return NextResponse.json({
    range,
    totalViews,
    uniqueViews: totalViews, // your current counter is already "unique-ish"
    avgEngagedSeconds,
    scroll75Rate,
    topArticle: topSlug ? { slug: topSlug, views: topViews } : null,
  });
}
