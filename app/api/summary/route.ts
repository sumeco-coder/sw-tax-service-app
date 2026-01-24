import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

export const runtime = "nodejs";

function getUserId(req: NextRequest) {
  const token =
    req.cookies.get("idToken")?.value ||
    req.cookies.get("accessToken")?.value;

  if (!token) return null;

  const payload = decodeJwt(token);
  return typeof payload.sub === "string" ? payload.sub : null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");

    if (!yearParam) {
      return NextResponse.json({ error: "Missing year" }, { status: 400 });
    }

    const year = Number(yearParam);
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    // ✅ TODO: Replace this with your real questionnaire lookup (DB query)
    // Return something stable so the frontend doesn't crash:
    return NextResponse.json({
      userId,
      taxYear: year,
      summary: null, // <- fill with real data later
      completed: false,
      updatedAt: null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch questionnaire summary" },
      { status: 500 }
    );
  }
}
