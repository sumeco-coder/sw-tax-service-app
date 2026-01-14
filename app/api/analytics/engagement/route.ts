// app/api/analytics/engagement/route.ts
import { NextResponse } from "next/server";
import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws/dynamodb";
import { isBot } from "@/lib/analytics/isBot";
import crypto from "crypto";

const TABLE = process.env.ANALYTICS_TABLE_NAME ?? "ArticleAnalytics";
const TTL_SECONDS = 60 * 60 * 24; // 24 hours

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
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
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const slug = String(body?.slug ?? "").trim();
  const durationRaw = Number(body?.duration ?? 0);

  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

  const ua = req.headers.get("user-agent");
  if (isBot(ua)) return NextResponse.json({ ok: true });

  // Only count real-ish engagement
  // clamp: 3s to 30m
  const duration = Math.max(3, Math.min(1800, Math.round(durationRaw)));
  if (!Number.isFinite(duration)) return NextResponse.json({ ok: true });

  const day = todayKey();
  const now = Math.floor(Date.now() / 1000);

  // Dedupe: once per day per visitor per slug
  const ip = getClientIp(req);
  const fp = hash(`${slug}|${day}|${ip}|${ua ?? "unknown"}`);
  const dedupeKey = { pk: `DEDUPE#ENGAGE#${slug}#${day}`, sk: fp };

  // 1) Try to write dedupe record (only first one wins)
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          ...dedupeKey,
          expiresAt: now + TTL_SECONDS,
        },
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
      })
    );
  } catch (e: any) {
    // Already counted today
    if (e?.name === "ConditionalCheckFailedException") {
      return NextResponse.json({ ok: true });
    }
    // Other error
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // 2) Update DAILY rollup
  const dailyKey = { pk: `VIEW#${slug}`, sk: `DAY#${day}` };
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: dailyKey,
      UpdateExpression:
        "ADD engagedSecondsTotal :dur, engagementCount :one SET updatedAt = :iso",
      ExpressionAttributeValues: {
        ":dur": duration,
        ":one": 1,
        ":iso": new Date().toISOString(),
      },
    })
  );

  // 3) Update ALL-TIME aggregate (same item you use for viewCount)
  // This keeps everything in one place for easy admin totals.
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `VIEW#${slug}`, sk: "count" },
      UpdateExpression:
        "ADD engagedSecondsTotal :dur, engagementCount :one SET updatedAt = :iso",
      ExpressionAttributeValues: {
        ":dur": duration,
        ":one": 1,
        ":iso": new Date().toISOString(),
      },
    })
  );

  return NextResponse.json({ ok: true });
}
