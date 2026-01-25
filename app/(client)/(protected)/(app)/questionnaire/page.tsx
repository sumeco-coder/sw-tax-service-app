// app/(client)/(protected)/(app)/questionnaire/page.tsx
import { redirect } from "next/navigation";
import QuestionnaireClient from "./_components/QuestionnaireClient";
import { getQuestionnairePrefill } from "./actions";
import { getUserIdFromCookies } from "@/lib/auth/getUserIdFromCookies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QuestionnairePage({
  searchParams,
}: {
  searchParams: { step?: string };
}) {
  const userId = await getUserIdFromCookies();
  if (!userId) redirect("/sign-in");

  const prefill = await getQuestionnairePrefill();
  const initialStep = String(searchParams.step ?? "IDENTIFICATION");

  return <QuestionnaireClient prefill={prefill as any} initialStep={initialStep} />;
}
