// app/(client)/onboarding/questions/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function saveQuestions(formData: FormData) {
  const cognitoSub = (formData.get("cognitoSub") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();

  if (!cognitoSub || !email) {
    throw new Error("Missing user identity for onboarding questions.");
  }

  // Helper to read simple string
  const getStr = (name: string) =>
    ((formData.get(name) as string | null)?.trim() || "") || undefined;

  // Helper to convert yes/no → boolean | null
  const getBool = (name: string): boolean | null => {
    const v = (formData.get(name) as string | null)?.toLowerCase();
    if (v === "yes") return true;
    if (v === "no") return false;
    return null;
  };

  const filingStatus = getStr("filingStatus");
  const dependentsCountRaw = (formData.get("dependentsCount") as string | null)?.trim();
  const dependentsCount =
    dependentsCountRaw && !Number.isNaN(Number(dependentsCountRaw))
      ? Number(dependentsCountRaw)
      : null;

  const hasDependents = getBool("hasDependents");
  const workedW2 = getBool("workedW2");
  const hasSelfEmployment = getBool("hasSelfEmployment");
  const hasGigIncome = getBool("hasGigIncome");
  const hasInvestments = getBool("hasInvestments");
  const hasRetirement = getBool("hasRetirement");
  const hasUnemployment = getBool("hasUnemployment");
  const hasOtherIncome = getBool("hasOtherIncome");

  const paidChildcare = getBool("paidChildcare");
  const paidEducation = getBool("paidEducation");
  const hasStudentLoans = getBool("hasStudentLoans");
  const hadMedicalExpenses = getBool("hadMedicalExpenses");
  const donatedToCharity = getBool("donatedToCharity");
  const ownsHome = getBool("ownsHome");
  const contributedRetirement = getBool("contributedRetirement");

  const movedLastYear = getBool("movedLastYear");
  const marriageDivorce = getStr("marriageDivorce");
  const hadBaby = getBool("hadBaby");
  const gotIrsLetter = getBool("gotIrsLetter");

  const mainGoal = getStr("mainGoal");
  const extraNotes = getStr("extraNotes");

  // Pack into a single JSON blob to store in users.bio for now
  const intake = {
    filingStatus,
    hasDependents,
    dependentsCount,
    workedW2,
    hasSelfEmployment,
    hasGigIncome,
    hasInvestments,
    hasRetirement,
    hasUnemployment,
    hasOtherIncome,
    paidChildcare,
    paidEducation,
    hasStudentLoans,
    hadMedicalExpenses,
    donatedToCharity,
    ownsHome,
    contributedRetirement,
    movedLastYear,
    marriageDivorce,
    hadBaby,
    gotIrsLetter,
    mainGoal,
    extraNotes,
  };

  const intakeJson = JSON.stringify(intake);

  // Does this user already exist?
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing.length === 0) {
    // Minimal create (you already collect full profile on /onboarding/profile)
    await db.insert(users).values({
      cognitoSub,
      email,
      bio: intakeJson, // using bio as "intake notes" for now
      onboardingStep: "SCHEDULE",
    });
  } else {
    await db
      .update(users)
      .set({
        bio: intakeJson,
        onboardingStep: "SCHEDULE",
        updatedAt: new Date(),
      })
      .where(eq(users.cognitoSub, cognitoSub));
  }

  // Next step in your flow:
  redirect("/onboarding/schedule");
}
