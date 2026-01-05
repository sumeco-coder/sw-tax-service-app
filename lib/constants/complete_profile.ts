// lib/constants/complete_profile.ts
import { ONBOARDING_FLOW } from "@/lib/constants/onboarding";
import { QUESTIONNAIRE_FIRST_STEP } from "@/lib/constants/questionnaire";

export const COMPLETE_PROFILE_FLOW = ONBOARDING_FLOW.map((step) => {
  if (step.id !== "PROFILE") return step;

  return {
    ...step,
    label: "Questionnaire",
    description: "Complete your questionnaire so we can prepare accurately.",
    href: QUESTIONNAIRE_FIRST_STEP.href,
  };
});
