// app/(client)/questionnaire/page.tsx
"use client";

import React from "react";

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
  "rounded-lg px-3 py-2 text-xs sm:text-sm " +
  "data-[state=active]:text-white data-[state=active]:shadow-sm " +
  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]";

export default function QuestionnairePage() {
  const handleSaveDependent = async (values: DependentQuestionnaireValues) => {
    const res = await fetch("/api/dependents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save dependent");
    }
  };

  const handleSaveDirectDeposit = async (values: DirectDepositValues) => {
    const res = await fetch("/api/direct-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save direct deposit");
    }
  };

  const handleSaveEducation = async (
    values: EducationCreditsAndDeductionsValues
  ) => {
    const res = await fetch("/api/education-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save education credit info");
    }
  };

  const handleSaveHOH = async (values: HeadOfHouseholdDocumentationValues) => {
    const res = await fetch("/api/head-of-household-documentation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save HOH documentation");
    }
  };

  const handleSaveIdentification = async (
    values: IdentificationForTaxpayerAndSpouseValues
  ) => {
    const res = await fetch("/api/identification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save identification info");
    }
  };

  const handleSaveEstimated = async (
    values: EstimatedFederalTaxPaymentsValues
  ) => {
    const res = await fetch("/api/estimated-tax-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save estimated tax payments");
    }
  };

  const handleSaveEstimatedState = async (
    values: EstimatedStateTaxPaymentsValues
  ) => {
    const res = await fetch("/api/estimated-state-tax-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err?.error || "Failed to save estimated state tax payments"
      );
    }
  };

  const handleSaveIncomeDocs = async (
    values: IncomeDocumentationAssistanceValues
  ) => {
    const res = await fetch("/api/income-documentation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save income documentation");
    }
  };

  const handleSaveQualChild = async (
    values: QualifyingChildAssistanceValues
  ) => {
    const res = await fetch("/api/qualifying-children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) throw new Error("Failed to save qualifying child info");
  };

  const handleSaveForeignAccountAndDigital = async (
    values: ForeignAccountAndDigitalAssetsValues
  ) => {
    const res = await fetch("/api/foreign-accounts-digital-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err?.error || "Failed to save foreign account/digital asset info"
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Questionnaire
          </h1>
          <div className="mt-2 h-1 w-28 rounded-full" style={brandBar} />
          <p className="mt-3 text-sm text-slate-600">
            Complete your required questionnaires and documentation.
          </p>
        </div>

        {/* Tabs Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Tabs defaultValue="dependent">
            {/* ✅ 8 tabs -> use responsive grid */}
            <TabsList
              className="
    h-auto w-full
    grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6
    gap-1
    rounded-xl bg-white p-1 ring-1 ring-slate-200
  "
            >
              <TabsTrigger
                value="dependent"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                Dependents
              </TabsTrigger>
              <TabsTrigger
                value="directDeposit"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                Direct Deposit
              </TabsTrigger>

              <TabsTrigger
                value="education"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                Education Credits
              </TabsTrigger>

              <TabsTrigger
                value="hoh"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                HOH Docs
              </TabsTrigger>

              <TabsTrigger
                value="identification"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                ID (Taxpayer/Spouse)
              </TabsTrigger>

              <TabsTrigger
                value="estimated"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                Estimated Taxes
              </TabsTrigger>

              <TabsTrigger
                value="estimatedState"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                Estimated State
              </TabsTrigger>

              <TabsTrigger
                value="incomeDocs"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                Income Docs
              </TabsTrigger>

              <TabsTrigger
                value="qualChild"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                Qualifying Child
              </TabsTrigger>

              <TabsTrigger
                value="foreignAssets"
                className="
      min-w-0 whitespace-normal text-center leading-snug
      rounded-lg px-2 py-2 text-xs sm:text-sm
      data-[state=active]:text-white data-[state=active]:shadow-sm
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]
    "
              >
                Foreign / Digital Assets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dependent" className="mt-5">
              <DependentQuestionnaire onSave={handleSaveDependent} />
            </TabsContent>

            <TabsContent value="directDeposit" className="mt-5">
              <DirectDepositInformation onSave={handleSaveDirectDeposit} />
            </TabsContent>

            <TabsContent value="education" className="mt-5">
              <EducationCreditsAndDeductions onSave={handleSaveEducation} />
            </TabsContent>

            <TabsContent value="hoh" className="mt-5">
              <HeadOfHouseholdDocumentation onSave={handleSaveHOH} />
            </TabsContent>

            <TabsContent value="identification" className="mt-5">
              <IdentificationForTaxpayerAndSpouse
                onSave={handleSaveIdentification}
              />
            </TabsContent>

            <TabsContent value="estimated" className="mt-5">
              <EstimatedFederalTaxPayments onSave={handleSaveEstimated} />
            </TabsContent>

            <TabsContent value="estimatedState" className="mt-5">
              <EstimatedStateTaxPayments onSave={handleSaveEstimatedState} />
            </TabsContent>

            <TabsContent value="incomeDocs" className="mt-5">
              <IncomeDocumentationAssistance onSave={handleSaveIncomeDocs} />
            </TabsContent>

            <TabsContent value="qualChild" className="mt-5">
              <QualifyingChildAssistance onSave={handleSaveQualChild} />
            </TabsContent>

            <TabsContent value="foreignAssets" className="mt-5">
              <ForeignAccountAndDigitalAssets
                onSave={handleSaveForeignAccountAndDigital}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
