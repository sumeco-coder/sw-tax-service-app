// app/(client)/(protected)/onboarding/documents/page.tsx
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";
import OnboardingDocumentsClient from "./_components/OnboardingDocumentsClient";

export default async function OnboardingDocumentsPage() {
  const auth = await getServerRole();
  if (!auth?.sub) redirect("/sign-in");

  return <OnboardingDocumentsClient />;
}
