// app/api/onboarding-step/route.ts
import { NextResponse } from "next/server";
// import your db, getCurrentUser, etc.

type OnboardingStep = "PROFILE" | "BUSINESS" | "VERIFICATION" | "COMPLETE";

export async function GET() {
  // look up user’s onboardingStep in DB; fallback "PROFILE"
  const step: OnboardingStep = "PROFILE"; // replace with real value
  return NextResponse.json({ step });
}
