// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

type FilingStatus =
  | ""
  | "Single"
  | "Married Filing Jointly"
  | "Married Filing Separately"
  | "Head of Household"
  | "Qualifying Widow(er)";

const FILING_SET = new Set<FilingStatus>([
  "",
  "Single",
  "Married Filing Jointly",
  "Married Filing Separately",
  "Head of Household",
  "Qualifying Widow(er)",
]);

function sanitizeUpdates(input: any) {
  const out: Record<string, any> = {};

  // Identity/profile (optional to update)
  if (typeof input.firstName === "string")
    out.firstName = input.firstName.trim().slice(0, 60);
  if (typeof input.lastName === "string")
    out.lastName = input.lastName.trim().slice(0, 60);

  if (typeof input.dob === "string" && input.dob) {
    const d = new Date(input.dob);
    if (!Number.isNaN(d.getTime())) out.dob = d;
  }

  // Email/phone (DB mirror)
  if (typeof input.email === "string")
    out.email = input.email.trim().toLowerCase().slice(0, 254);
  if (typeof input.phone === "string") out.phone = input.phone.trim().slice(0, 30);

  // Address
  if (typeof input.address1 === "string")
    out.address1 = input.address1.trim().slice(0, 100);
  if (typeof input.address2 === "string")
    out.address2 = input.address2.trim().slice(0, 100);
  if (typeof input.city === "string") out.city = input.city.trim().slice(0, 80);
  if (typeof input.state === "string")
    out.state = input.state.trim().toUpperCase().slice(0, 2);
  if (typeof input.zip === "string") out.zip = input.zip.trim().slice(0, 10);

  // Filing status
  if (typeof input.filingStatus === "string") {
    const v = input.filingStatus as FilingStatus;
    if (!FILING_SET.has(v)) throw new Error("Invalid filing status");
    out.filingStatus = v;
  }

  // Optional mirrors
  if (typeof input.bio === "string") out.bio = input.bio.trim().slice(0, 500);
  if (typeof input.avatarUrl === "string")
    out.avatarUrl = input.avatarUrl.trim().slice(0, 500);

  // Optional onboardingStep (only if you actually want to allow this from clients)
  if (typeof input.onboardingStep === "string") {
    out.onboardingStep = input.onboardingStep;
  }

  // Compute full name when first/last provided
  const fn = out.firstName ?? null;
  const ln = out.lastName ?? null;
  const full = [fn, ln].filter(Boolean).join(" ").trim();
  if (full) out.name = full;

  return out;
}

async function requireAuth() {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  if (!sub) return null;
  return { sub, email: auth?.email ? String(auth.email) : "" };
}

// --- GET /api/profile ---
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.cognitoSub, auth.sub))
      .limit(1);

    if (!u) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    return NextResponse.json({
      id: u.id,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      name: u.name ?? "",
      dob: u.dob ? new Date(u.dob).toISOString().slice(0, 10) : "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      address1: u.address1 ?? "",
      address2: u.address2 ?? "",
      city: u.city ?? "",
      state: u.state ?? "",
      zip: u.zip ?? "",
      filingStatus: (u.filingStatus ?? "") as FilingStatus,
      avatarUrl: u.avatarUrl ?? "",
      bio: u.bio ?? "",
      onboardingStep: u.onboardingStep ?? null,
    });
  } catch (err: any) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- PATCH /api/profile ---
export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    let updates: Record<string, any>;
    try {
      updates = sanitizeUpdates(body);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Invalid input" }, { status: 400 });
    }

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    updates.updatedAt = new Date();

    await db.update(users).set(updates).where(eq(users.cognitoSub, auth.sub));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
