// app/api/analytics/view/route.ts
import { NextResponse } from "next/server";
import { ddb } from "@/lib/aws/dynamodb";
import { isBot } from "@/lib/analytics/isBot";
import { PutCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const TABLE = process.env.ANALYTICS_TABLE_NAME ?? "ArticleAnalytics";
const TTL_SECONDS = 60 * 60 * 24; // 24 hours

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function hash(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 24);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const slug = String(body?.slug ?? "").trim();
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

  const ua = req.headers.get("user-agent");
  if (isBot(ua)) return NextResponse.json({ ok: true });

  const day = todayKey();
  const now = Math.floor(Date.now() / 1000);

  // ✅ better dedupe: slug + day + IP + UA
  const ip = getClientIp(req);
  const fp = hash(`${slug}|${day}|${ip}|${ua ?? "unknown"}`);

  // ✅ atomic dedupe record (only first request counts)
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          pk: `DEDUPE#VIEW#${slug}#${day}`,
          sk: fp,
          expiresAt: now + TTL_SECONDS,
        },
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
      })
    );
  } catch (e: any) {
    // Already counted today for this visitor
    if (e?.name === "ConditionalCheckFailedException") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // ✅ increment all-time
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `VIEW#${slug}`, sk: "count" },
      UpdateExpression: "ADD #count :one SET updatedAt = :iso",
      ExpressionAttributeNames: { "#count": "count" },
      ExpressionAttributeValues: {
        ":one": 1,
        ":iso": new Date().toISOString(),
      },
    })
  );

  // ✅ optional but recommended: daily rollup for charts
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `VIEW#${slug}`, sk: `DAY#${day}` },
      UpdateExpression: "ADD views :one SET updatedAt = :iso",
      ExpressionAttributeValues: {
        ":one": 1,
        ":iso": new Date().toISOString(),
      },
    })
  );

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ views: 0 });

  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { pk: `VIEW#${slug}`, sk: "count" },
    })
  );

  return NextResponse.json({
    views: Number((result.Item as any)?.count ?? 0) || 0,
  });
}
