// app/(client)/(protected)/(app)/questionnaire/page.tsx
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import QuestionnaireClient from "./_components/QuestionnaireClient";
import { completeQuestionnaire } from "./actions";

import type { QuestionnairePrefill } from "@/types/questionnaire";
import { getUserIdFromCookies } from "@/lib/auth/getUserIdFromCookies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getBaseUrl() {
  const h = await headers(); // ✅ await (your error)
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function cookieHeaderString() {
  const c = await cookies(); // ✅ await (matches your setup elsewhere)
  return c
    .getAll()
    .map((kv) => `${kv.name}=${kv.value}`)
    .join("; ");
}

async function getJson(path: string) {
  const base = await getBaseUrl();
  const cookie = await cookieHeaderString();

  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: { cookie },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export default async function QuestionnairePage() {
  const userId = await getUserIdFromCookies();
  if (!userId) redirect("/sign-in");

  const [
    dependentsRes,
    directDepositRes,
    educationRes,
    hohRes,
    identificationRes,
    estimatedRes,
    estimatedStateRes,
    incomeDocsRes,
    qualChildRes,
    foreignAssetsRes,
  ] = await Promise.all([
    getJson("/api/dependents"),
    getJson("/api/direct-deposit"),
    getJson("/api/education-credits"),
    getJson("/api/head-of-household-documentation"),
    getJson("/api/identification"),
    getJson("/api/estimated-tax-payments"),
    getJson("/api/estimated-state-tax-payments"),
    getJson("/api/income-documentation"),
    getJson("/api/qualifying-children"),
    getJson("/api/foreign-accounts-digital-assets"),
  ]);

  const dependents =
    (dependentsRes?.dependents ??
      dependentsRes?.values ??
      (Array.isArray(dependentsRes) ? dependentsRes : [])) as QuestionnairePrefill["dependents"];

  const prefill: QuestionnairePrefill = {
    userId,
    dependents,
    directDeposit: (directDepositRes?.values ?? null) as any,
    educationCredits: (educationRes?.values ?? null) as any,
    headOfHouseholdDocs: (hohRes?.values ?? null) as any,
    identification: (identificationRes?.values ?? null) as any,
    estimatedTaxPayments: (estimatedRes?.values ?? null) as any,
    estimatedStateTaxPayments: (estimatedStateRes?.values ?? null) as any,
    incomeDocumentation: (incomeDocsRes?.values ?? null) as any,
    qualifyingChildren: (qualChildRes?.values ?? null) as any,
    foreignAccountsDigitalAssets: (foreignAssetsRes?.values ?? null) as any,
  };

  return (
    <QuestionnaireClient
      prefill={prefill}
      completeQuestionnaire={completeQuestionnaire}
    />
  );
}
