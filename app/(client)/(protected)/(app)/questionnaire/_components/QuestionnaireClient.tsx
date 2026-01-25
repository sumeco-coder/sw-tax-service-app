"use client";

import React, { useMemo, useState } from "react";
import type { QuestionnairePrefill } from "@/types/questionnaire";
import { completeQuestionnaire } from "../actions";

import DependentQuestionnaire from "./DependentQuestionnaire";

import DirectDepositInformation, {
  type DirectDepositValues,
} from "./DirectDepositInformation";

import EducationCreditsAndDeductions from "./EducationCreditsAndDeductions";


import HeadOfHouseholdDocumentation, {
  type HeadOfHouseholdDocumentationValues,
} from "./HeadOfHouseholdDocumentation";

import IdentificationForTaxpayerAndSpouse, {
  type IdentificationForTaxpayerAndSpouseValues,
} from "./IdentificationForTaxpayerAndSpouse";

import EstimatedFederalTaxPayments, {
  type EstimatedFederalTaxPaymentsValues,
} from "./EstimatedFederalTaxPayments";

import EstimatedStateTaxPayments, {
  type EstimatedStateTaxPaymentsValues,
} from "./EstimatedStateTaxPayments";

import IncomeDocumentationAssistance, {
  type IncomeDocumentationAssistanceValues,
} from "./IncomeDocumentationAssistance";

import QualifyingChildAssistance, {
  type QualifyingChildAssistanceValues,
} from "./QualifyingChildAssistance";

import ForeignAccountAndDigitalAssets, {
  type ForeignAccountAndDigitalAssetsValues,
} from "./ForeignAccountAndDigitalAssets";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

type DepItem = {
  dependentId: string;
  values: any;
  meta?: { ssnOnFile?: boolean; ssnLast4?: string | null };
};

type Props = {
  prefill: QuestionnairePrefill;
  initialStep?: string;
};

const REL_OPTIONS = [
  "Son",
  "Daughter",
  "Foster child",
  "Grandchild",
  "Stepchild",
  "Grandparent",
  "Parent",
  "Brother",
  "Half-brother",
  "Stepbrother",
  "Sister",
  "Half-sister",
  "Stepsister",
  "Aunt",
  "Uncle",
  "Nephew",
  "Niece",
  "Sibling",
  "Other",
] as const;

export default function QuestionnaireClient({ prefill }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("dependent");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const initialDeps: DepItem[] = useMemo(() => {
    const raw = Array.isArray((prefill as any)?.dependents)
      ? (prefill as any).dependents
      : [];
    return raw
      .map((d: any) => ({
        dependentId: String(d.dependentId ?? d.id ?? ""),
        values: d.values ?? d,
        meta: d.meta ?? {
          ssnOnFile: Boolean(d?.hasSsn),
          ssnLast4: d?.ssnLast4 ?? null,
        },
      }))
      .filter((x: DepItem) => !!x.dependentId);
  }, [prefill]);

  const [depsList, setDepsList] = useState<DepItem[]>(initialDeps);
  const [activeDependentId, setActiveDependentId] = useState<string>(
    initialDeps[0]?.dependentId ?? "",
  );

  const selectedDependentId = activeDependentId;

  const [newDep, setNewDep] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    relationship: "",
  });

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
    [],
  );

  async function postJson<T>(url: string, values: T, fallbackMsg: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}) as any);
      throw new Error(err?.error || fallbackMsg);
    }
  }

  // --- Save handlers ---
  const handleSaveDirectDeposit = async (values: DirectDepositValues) =>
    postJson("/api/direct-deposit", values, "Failed to save direct deposit");

  const handleSaveHOH = async (values: HeadOfHouseholdDocumentationValues) =>
    postJson(
      "/api/head-of-household-documentation",
      values,
      "Failed to save HOH documentation",
    );

  const handleSaveIdentification = async (
    values: IdentificationForTaxpayerAndSpouseValues,
  ) =>
    postJson(
      "/api/identification",
      values,
      "Failed to save identification info",
    );

  const handleSaveEstimated = async (
    values: EstimatedFederalTaxPaymentsValues,
  ) =>
    postJson(
      "/api/estimated-tax-payments",
      values,
      "Failed to save estimated tax payments",
    );

  const handleSaveEstimatedState = async (
    values: EstimatedStateTaxPaymentsValues,
  ) =>
    postJson(
      "/api/estimated-state-tax-payments",
      values,
      "Failed to save estimated state tax payments",
    );

  const handleSaveIncomeDocs = async (
    values: IncomeDocumentationAssistanceValues,
  ) =>
    postJson(
      "/api/income-documentation",
      values,
      "Failed to save income documentation",
    );

  const handleSaveQualChild = async (values: QualifyingChildAssistanceValues) =>
    postJson(
      "/api/qualifying-children",
      values,
      "Failed to save qualifying child info",
    );

  const handleSaveForeignAccountAndDigital = async (
    values: ForeignAccountAndDigitalAssetsValues,
  ) =>
    postJson(
      "/api/foreign-accounts-digital-assets",
      values,
      "Failed to save foreign account/digital asset info",
    );

  function wrapSave<T>(fn: (values: T) => Promise<void>) {
    return async (values: T) => {
      setToast(null);
      setSaving(true);
      try {
        await fn(values);
        setToast({ type: "success", msg: "Saved successfully." });
      } catch (e: any) {
        setToast({ type: "error", msg: e?.message ?? "Failed to save." });
        throw e;
      } finally {
        setSaving(false);
      }
    };
  }

  async function createDependentInline() {
    setToast(null);
    setSaving(true);

    try {
      const payload = {
        firstName: newDep.firstName.trim(),
        middleName: "",
        lastName: newDep.lastName.trim(),
        dob: newDep.dob, // YYYY-MM-DD
        relationship: newDep.relationship,
        monthsLived: 12,
        isStudent: false,
        isDisabled: false,
        appliedButNotReceived: false,
        // ✅ omit ssn (they will enter it in DependentQuestionnaire)
      };

      const res = await fetch("/api/dependents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}) as any);
      if (!res.ok) throw new Error(body?.error || "Failed to add dependent.");

      const newId = String(body?.id ?? body?.dependentId ?? "");
      if (!newId) throw new Error("Dependent created, but no id returned.");

      const entry: DepItem = {
        dependentId: newId,
        meta: { ssnOnFile: false, ssnLast4: null },
        values: {
          firstName: payload.firstName,
          middleName: "",
          lastName: payload.lastName,
          dob: payload.dob,
          relationship: payload.relationship,
          monthsInHome: "12",
          isStudent: false,
          isDisabled: false,
          appliedButNotReceived: false,
          ssnOnFile: false,
          ssn: "",
        },
      };

      setDepsList((prev) => [entry, ...prev]);
      setActiveDependentId(newId);

      setNewDep({ firstName: "", lastName: "", dob: "", relationship: "" });

      setToast({
        type: "success",
        msg: "Dependent added. Fill out their questionnaire below (including SSN).",
      });
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.message ?? "Failed to add dependent.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Questionnaire
              </h1>
              <div className="mt-2 h-1 w-28 rounded-full" style={brandBar} />
              <p className="mt-3 text-sm text-slate-600">
                Complete your required questionnaires and documentation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {saving ? "Saving…" : "Ready"}
              </span>

              <form action={completeQuestionnaire}>
                <input type="hidden" name="next" value="/dashboard" />
                <Button
                  type="submit"
                  disabled={saving}
                  className="text-white hover:opacity-90"
                  style={brandBar}
                >
                  Finish
                </Button>
              </form>
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
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabKey)}
          >
            <TabsList
              className="
                h-auto w-full
                grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6
                gap-1
                rounded-xl bg-white p-1 ring-1 ring-slate-200
              "
            >
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className={tabTriggerClass}
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ---------------- Dependents ---------------- */}
            <TabsContent value="dependent" className="mt-5 space-y-4">
              {/* Inline add form (no popup) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-800">
                  Add a dependent
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>First name</Label>
                    <Input
                      value={newDep.firstName}
                      onChange={(e) =>
                        setNewDep((p) => ({ ...p, firstName: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Last name</Label>
                    <Input
                      value={newDep.lastName}
                      onChange={(e) =>
                        setNewDep((p) => ({ ...p, lastName: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Date of birth</Label>
                    <Input
                      type="date"
                      value={newDep.dob}
                      onChange={(e) =>
                        setNewDep((p) => ({ ...p, dob: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Relationship</Label>

                    <Select
                      value={newDep.relationship}
                      onValueChange={(v) =>
                        setNewDep((p) => ({ ...p, relationship: v }))
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>

                      <SelectContent>
                        {REL_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-600">
                    SSN is entered inside the dependent questionnaire after you
                    add them.
                  </p>

                  <Button
                    type="button"
                    className="rounded-xl text-white hover:opacity-90"
                    style={brandBar}
                    disabled={
                      saving ||
                      !newDep.firstName.trim() ||
                      !newDep.lastName.trim() ||
                      !newDep.dob ||
                      !newDep.relationship.trim()
                    }
                    onClick={createDependentInline}
                  >
                    Add dependent
                  </Button>
                </div>
              </div>

              {/* Selector + questionnaire */}
              {depsList.length ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-sm font-semibold text-slate-800">
                      Select dependent
                    </div>

                    <div className="mt-2 max-w-md">
                      <Select
                        value={activeDependentId}
                        onValueChange={setActiveDependentId}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choose a dependent" />
                        </SelectTrigger>
                        <SelectContent>
                          {depsList.map((d) => (
                            <SelectItem
                              key={d.dependentId}
                              value={d.dependentId}
                            >
                              {d.values?.firstName} {d.values?.lastName} (
                              {String(d.values?.dob ?? "").slice(0, 10)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {activeDependentId ? (
                    <DependentQuestionnaire dependentId={activeDependentId} />
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Select a dependent to start their questionnaire.
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  No dependents yet. Add one above to begin.
                </div>
              )}
            </TabsContent>

            {/* ---------------- Direct Deposit ---------------- */}
            <TabsContent value="directDeposit" className="mt-5">
              <DirectDepositInformation
                onSave={wrapSave(handleSaveDirectDeposit)}
                initialValues={
                  prefill.directDeposit
                    ? {
                        useDirectDeposit:
                          prefill.directDeposit.useDirectDeposit,
                        accountHolderName:
                          prefill.directDeposit.accountHolderName,
                        bankName: prefill.directDeposit.bankName,
                        accountType: prefill.directDeposit.accountType,
                        routingNumber: "",
                        accountNumber: "",
                        confirmAccountNumber: "",
                      }
                    : undefined
                }
              />
            </TabsContent>

            <TabsContent value="education" className="mt-5">
              {selectedDependentId ? (
                <EducationCreditsAndDeductions
                  dependentId={selectedDependentId}
                />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Select a dependent to start Education Credits.
                </div>
              )}
            </TabsContent>

            <TabsContent value="hoh" className="mt-5">
              <HeadOfHouseholdDocumentation
                onSave={wrapSave(handleSaveHOH)}
                initialValues={prefill.headOfHouseholdDocs ?? undefined}
              />
            </TabsContent>

            <TabsContent value="identification" className="mt-5">
              <IdentificationForTaxpayerAndSpouse
                onSave={wrapSave(handleSaveIdentification)}
                initialValues={prefill.identification ?? undefined}
              />
            </TabsContent>

            <TabsContent value="estimated" className="mt-5">
              <EstimatedFederalTaxPayments
                onSave={wrapSave(handleSaveEstimated)}
                initialValues={prefill.estimatedTaxPayments ?? undefined}
              />
            </TabsContent>

            <TabsContent value="estimatedState" className="mt-5">
              <EstimatedStateTaxPayments
                onSave={wrapSave(handleSaveEstimatedState)}
                initialValues={prefill.estimatedStateTaxPayments ?? undefined}
              />
            </TabsContent>

            <TabsContent value="incomeDocs" className="mt-5">
              <IncomeDocumentationAssistance
                onSave={wrapSave(handleSaveIncomeDocs)}
                initialValues={prefill.incomeDocumentation ?? undefined}
              />
            </TabsContent>

            <TabsContent value="qualChild" className="mt-5">
              <QualifyingChildAssistance
                onSave={wrapSave(handleSaveQualChild)}
                initialValues={prefill.qualifyingChildren ?? undefined}
              />
            </TabsContent>

            <TabsContent value="foreignAssets" className="mt-5">
              <ForeignAccountAndDigitalAssets
                onSave={wrapSave(handleSaveForeignAccountAndDigital)}
                initialValues={
                  prefill.foreignAccountsDigitalAssets ?? undefined
                }
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
