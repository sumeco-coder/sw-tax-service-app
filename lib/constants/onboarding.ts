import type { OnboardingStep } from "@/types/dashboard";

export const ONBOARDING_FLOW: Array<{
  id: OnboardingStep;
  label: string;
  description: string;
  href: string;
}> = [
  {
    id: "PROFILE",
    label: "Complete your profile",
    description: "Confirm your contact details and basic tax information.",
    href: "/onboarding/profile",
  },
  {
    id: "DOCS",
    label: "Upload your tax documents",
    description: "Upload W-2s, 1099s, and any other tax documents.",
    href: "/onboarding/documents",
  },
  {
    id: "SCHEDULE",
    label: "Schedule your review call",
    description: "Pick a time to review your return with SW Tax.",
    href: "/onboarding/schedule",
  },
  {
    id: "SUBMITTED",
    label: "We’re preparing your return",
    description:
      "We’re working on your return. We’ll reach out if we need anything else.",
    href: "/onboarding/summary",
  },
  {
    id: "DONE",
    label: "You’re all set!",
    description:
      "Your onboarding is complete. You can view your return and documents anytime.",
    href: "/dashboard",
  },
];
