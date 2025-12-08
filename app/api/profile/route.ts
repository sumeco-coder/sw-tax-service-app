// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { db, users } from "@/drizzle/db";
import { eq } from "drizzle-orm";
import { configureAmplify } from "@/lib/amplifyClient";
import { getCurrentUser } from "aws-amplify/auth";

configureAmplify();

/**
 * GET  -> return flattened profile for the logged-in user
 * PATCH -> update allowed fields (address + filingStatus only)
 */

// --- helpers ---
async function getUserByCognitoSub() {
  // NOTE: getCurrentUser() is client-centric; if you have a server helper (e.g. getSessionUser),
  // prefer that. This works if you configured Amplify for SSR cookie storage.
  const currentUser = await getCurrentUser();
  const cognitoSub = currentUser.userId;

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  return u ?? null;
}

function sanitizeAddress(input: any) {
  const out: Record<string, string> = {};
  if (typeof input.address1 === "string") out.address1 = input.address1.trim().slice(0, 100);
  if (typeof input.address2 === "string") out.address2 = input.address2.trim().slice(0, 100);
  if (typeof input.city === "string") out.city = input.city.trim().slice(0, 80);
  if (typeof input.state === "string") out.state = input.state.trim().toUpperCase().slice(0, 2);
  if (typeof input.zip === "string") out.zip = input.zip.trim().slice(0, 10);
  return out;
}

const FILING_SET = new Set([
  "",
  "Single",
  "Married Filing Jointly",
  "Married Filing Separately",
  "Head of Household",
  "Qualifying Widow(er)",
]);

// --- GET /api/profile ---
export async function GET() {
  try {
    const user = await getUserByCognitoSub();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Flattened payload expected by your page
    return NextResponse.json({
      id: user.id,
      name: user.name ?? "",
      dob: user.dob ?? "",
      email: user.email ?? "",          // mirror only; not updated here
      phone: user.phone ?? "",          // mirror only; not updated here
      address1: user.address1 ?? "",
      address2: user.address2 ?? "",
      city: user.city ?? "",
      state: user.state ?? "",
      zip: user.zip ?? "",
      filingStatus: user.filingStatus ?? "",
      avatarUrl: user.avatarUrl ?? "",  // optional mirror, read-only here
      bio: user.bio ?? "",              // optional mirror, read-only here
    });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- PATCH /api/profile ---
export async function PATCH(req: Request) {
  try {
    const user = await getUserByCognitoSub();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Whitelist only address + filingStatus
    const addr = sanitizeAddress(body);

    let filingStatus: string | undefined;
    if (typeof body.filingStatus === "string") {
      if (!FILING_SET.has(body.filingStatus)) {
        return NextResponse.json({ error: "Invalid filing status" }, { status: 400 });
      }
      filingStatus = body.filingStatus;
    }

    const updates: Record<string, any> = {
      ...(Object.keys(addr).length ? addr : {}),
      ...(filingStatus !== undefined ? { filingStatus } : {}),
      updatedAt: new Date(),
    };

    // Prevent empty updates
    const keys = Object.keys(updates).filter((k) => k !== "updatedAt");
    if (keys.length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    await db.update(users).set(updates).where(eq(users.id, user.id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
