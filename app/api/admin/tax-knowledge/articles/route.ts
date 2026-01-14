import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws/dynamodb";
import { getServerRole } from "@/lib/auth/roleServer";

const TABLE = process.env.ANALYTICS_TABLE_NAME ?? "ArticleAnalytics";

function isAdminRole(role: unknown) {
  return String(role ?? "").toLowerCase() === "admin";
}

function titleFromSlug(slug: string) {
  // "no-tax-on-tips-2025" => "No Tax On Tips 2025"
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function GET(req: Request) {
  const me = await getServerRole();
  if (!me?.sub || !isAdminRole(me.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "7d") as "7d" | "30d" | "all";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

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

  const rows = items
    .map((it) => {
      const slug = it.pk.replace(/^VIEW#/, "");
      const views = Number(it.count ?? 0);

      return {
        slug,
        title: titleFromSlug(slug),
        category: "Tax Knowledge",
        views,
        uniqueViews: views,
        avgEngagedSeconds: 0,
        scroll75Rate: 0,
        updatedAt: null,
        range, // not required, but nice for debugging
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

  return NextResponse.json(rows);
}
