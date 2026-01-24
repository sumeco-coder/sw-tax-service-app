// app/(client)/(protected)/(app)/questionnaire/page.tsx
"use client";

import React, { useMemo, useState } from "react";

import DependentQuestionnaire, {
  type DependentQuestionnaireValues,
} from "./_components/DependentQuestionnaire";

import DirectDepositInformation, {
  type DirectDepositValues,
} from "./_components/DirectDepositInformation";

import EducationCreditsAndDeductions, {
  type EducationCreditsAndDeductionsValues,
} from "./_components/EducationCreditsAndDeductions";

import HeadOfHouseholdDocumentation, {
  type HeadOfHouseholdDocumentationValues,
} from "./_components/HeadOfHouseholdDocumentation";

import IdentificationForTaxpayerAndSpouse, {
  type IdentificationForTaxpayerAndSpouseValues,
} from "./_components/IdentificationForTaxpayerAndSpouse";

import EstimatedFederalTaxPayments, {
  type EstimatedFederalTaxPaymentsValues,
} from "./_components/EstimatedFederalTaxPayments";

import EstimatedStateTaxPayments, {
  type EstimatedStateTaxPaymentsValues,
} from "./_components/EstimatedStateTaxPayments";

import IncomeDocumentationAssistance, {
  type IncomeDocumentationAssistanceValues,
} from "./_components/IncomeDocumentationAssistance";

import QualifyingChildAssistance, {
  type QualifyingChildAssistanceValues,
} from "./_components/QualifyingChildAssistance";

import ForeignAccountAndDigitalAssets, {
  type ForeignAccountAndDigitalAssetsValues,
} from "./_components/ForeignAccountAndDigitalAssets";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const brandBar = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

const tabTriggerClass =
  "min-w-0 whitespace-normal text-center leading-snug " +
  "rounded-lg px-2 py-2 text-xs sm:text-sm " +
  "data-[state=active]:text-white data-[state=active]:shadow-sm " +
  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]";

type TabKey =
  | "dependent"
  | "directDeposit"
  | "education"
  | "hoh"
  | "identification"
  | "estimated"
  | "estimatedState"
  | "incomeDocs"
  | "qualChild"
  | "foreignAssets";

export default function QuestionnairePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("dependent");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(
    null
  );

  const tabs = useMemo(
    () =>
      [
        { key: "dependent", label: "Dependents" },
        { key: "directDeposit", label: "Direct Deposit" },
        { key: "education", label: "Education Credits" },
        { key: "hoh", label: "HOH Docs" },
        { key: "identification", label: "ID (Taxpayer/Spouse)" },
        { key: "estimated", label: "Estimated Taxes" },
        { key: "estimatedState", label: "Estimated State" },
        { key: "incomeDocs", label: "Income Docs" },
        { key: "qualChild", label: "Qualifying Child" },
        { key: "foreignAssets", label: "Foreign / Digital Assets" },
      ] as const,
    []
  );

  async function postJson<T>(url: string, values: T, fallbackMsg: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({} as any));
      throw new Error(err?.error || fallbackMsg);
    }
  }

  // --- Save handlers (each calls the right API) ---
  const handleSaveDependent = async (values: DependentQuestionnaireValues) =>
    postJson("/api/dependents", values, "Failed to save dependent");

  const handleSaveDirectDeposit = async (values: DirectDepositValues) =>
    postJson("/api/direct-deposit", values, "Failed to save direct deposit");

  const handleSaveEducation = async (values: EducationCreditsAndDeductionsValues) =>
    postJson("/api/education-credits", values, "Failed to save education credit info");

  const handleSaveHOH = async (values: HeadOfHouseholdDocumentationValues) =>
    postJson(
      "/api/head-of-household-documentation",
      values,
      "Failed to save HOH documentation"
    );

  const handleSaveIdentification = async (
    values: IdentificationForTaxpayerAndSpouseValues
  ) => postJson("/api/identification", values, "Failed to save identification info");

  const handleSaveEstimated = async (values: EstimatedFederalTaxPaymentsValues) =>
    postJson("/api/estimated-tax-payments", values, "Failed to save estimated tax payments");

  const handleSaveEstimatedState = async (values: EstimatedStateTaxPaymentsValues) =>
    postJson(
      "/api/estimated-state-tax-payments",
      values,
      "Failed to save estimated state tax payments"
    );

  const handleSaveIncomeDocs = async (values: IncomeDocumentationAssistanceValues) =>
    postJson("/api/income-documentation", values, "Failed to save income documentation");

  const handleSaveQualChild = async (values: QualifyingChildAssistanceValues) =>
    postJson("/api/qualifying-children", values, "Failed to save qualifying child info");

  const handleSaveForeignAccountAndDigital = async (
    values: ForeignAccountAndDigitalAssetsValues
  ) =>
    postJson(
      "/api/foreign-accounts-digital-assets",
      values,
      "Failed to save foreign account/digital asset info"
    );

  // Wrapper so each child can just call `onSave`
  function wrapSave<T>(fn: (values: T) => Promise<void>) {
    return async (values: T) => {
      setToast(null);
      setSaving(true);
      try {
        await fn(values);
        setToast({ type: "success", msg: "Saved successfully." });
      } catch (e: any) {
        setToast({ type: "error", msg: e?.message ?? "Failed to save." });
        throw e; // keep child components behavior (if they show inline errors)
      } finally {
        setSaving(false);
      }
    };
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Questionnaire</h1>
              <div className="mt-2 h-1 w-28 rounded-full" style={brandBar} />
              <p className="mt-3 text-sm text-slate-600">
                Complete your required questionnaires and documentation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {saving ? (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  Saving…
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  Ready
                </span>
              )}
            </div>
          </div>

          {toast ? (
            <div
              className={[
                "mt-4 rounded-xl border px-3 py-2 text-sm",
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700",
              ].join(" ")}
            >
              {toast.msg}
            </div>
          ) : null}
        </div>

        {/* Tabs Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            {/* ✅ responsive grid tab list */}
            <TabsList
              className="
                h-auto w-full
                grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6
                gap-1
                rounded-xl bg-white p-1 ring-1 ring-slate-200
              "
            >
              {tabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className={tabTriggerClass}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="dependent" className="mt-5">
              <DependentQuestionnaire dependentId="" onSave={wrapSave(handleSaveDependent)} />
            </TabsContent>

            <TabsContent value="directDeposit" className="mt-5">
              <DirectDepositInformation onSave={wrapSave(handleSaveDirectDeposit)} />
            </TabsContent>

            <TabsContent value="education" className="mt-5">
              <EducationCreditsAndDeductions onSave={wrapSave(handleSaveEducation)} />
            </TabsContent>

            <TabsContent value="hoh" className="mt-5">
              <HeadOfHouseholdDocumentation onSave={wrapSave(handleSaveHOH)} />
            </TabsContent>

            <TabsContent value="identification" className="mt-5">
              <IdentificationForTaxpayerAndSpouse onSave={wrapSave(handleSaveIdentification)} />
            </TabsContent>

            <TabsContent value="estimated" className="mt-5">
              <EstimatedFederalTaxPayments onSave={wrapSave(handleSaveEstimated)} />
            </TabsContent>

            <TabsContent value="estimatedState" className="mt-5">
              <EstimatedStateTaxPayments onSave={wrapSave(handleSaveEstimatedState)} />
            </TabsContent>

            <TabsContent value="incomeDocs" className="mt-5">
              <IncomeDocumentationAssistance onSave={wrapSave(handleSaveIncomeDocs)} />
            </TabsContent>

            <TabsContent value="qualChild" className="mt-5">
              <QualifyingChildAssistance onSave={wrapSave(handleSaveQualChild)} />
            </TabsContent>

            <TabsContent value="foreignAssets" className="mt-5">
              <ForeignAccountAndDigitalAssets
                onSave={wrapSave(handleSaveForeignAccountAndDigital)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
