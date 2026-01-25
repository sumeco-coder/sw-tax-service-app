// app/(client)/(protected)/(app)/questionnaire/_components/QuestionnaireClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { QuestionnairePrefill } from "@/types/questionnaire";
import { completeQuestionnaire } from "../actions";

import DependentQuestionnaire from "./DependentQuestionnaire";

import DirectDepositInformation, {
  type DirectDepositValues,
} from "./DirectDepositInformation";

import EducationCreditsAndDeductions, {
  type EducationCreditsAndDeductionsValues,
} from "./EducationCreditsAndDeductions";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  initialStep?: string; // optional deep link
};

export default function QuestionnaireClient({ prefill, initialStep }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("dependent");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // ---------------- Dependents: normalize to a stable shape ----------------
  const initialDeps = useMemo<DepItem[]>(() => {
    const raw = (prefill as any)?.dependents;
    if (!Array.isArray(raw)) return [];
    return raw.map((d: any) => ({
      dependentId: d.dependentId ?? d.id,
      values: d.values ?? d,
      meta: d.meta ?? { ssnOnFile: false, ssnLast4: null },
    }));
  }, [prefill]);

  const [depsList, setDepsList] = useState<DepItem[]>(initialDeps);
  const [activeDependentId, setActiveDependentId] = useState<string>(
    initialDeps[0]?.dependentId ?? ""
  );

  // keep client state in sync if prefill changes
  React.useEffect(() => {
    setDepsList(initialDeps);
    setActiveDependentId((prev) => prev || initialDeps[0]?.dependentId || "");
  }, [initialDeps]);

  // optional: support deep links like ?step=IDENTIFICATION (map to a tab)
  React.useEffect(() => {
    if (!initialStep) return;
    const s = String(initialStep).toUpperCase();
    const map: Record<string, TabKey> = {
      DEPENDENTS: "dependent",
      DEPENDENT: "dependent",
      DIRECT_DEPOSIT: "directDeposit",
      EDUCATION: "education",
      HOH: "hoh",
      HEAD_OF_HOUSEHOLD: "hoh",
      IDENTIFICATION: "identification",
      ESTIMATED: "estimated",
      ESTIMATED_STATE: "estimatedState",
      INCOME_DOCS: "incomeDocs",
      QUAL_CHILD: "qualChild",
      FOREIGN_ASSETS: "foreignAssets",
    };
    if (map[s]) setActiveTab(map[s]);
  }, [initialStep]);

  // ---------------- Add dependent on same page ----------------
  const [addOpen, setAddOpen] = useState(false);
  const [newDep, setNewDep] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    relationship: "",
  });

  async function createDependentOnSamePage() {
    setToast(null);
    setSaving(true);

    try {
      const payload = {
        firstName: newDep.firstName.trim(),
        middleName: "",
        lastName: newDep.lastName.trim(),
        dob: newDep.dob, // YYYY-MM-DD
        relationship: newDep.relationship.trim(),
        monthsInHome: 12,
        isStudent: false,
        isDisabled: false,
        appliedButNotReceived: false,
      };

      const res = await fetch("/api/dependents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || "Failed to add dependent.");
      }

      const data = await res.json().catch(() => ({} as any));
      // handle a few possible response shapes
      const created = data?.dependent ?? data?.value ?? data;
      const newId = created?.id ?? created?.dependentId;
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

      setDepsList((prev) => [...prev, entry]);
      setActiveDependentId(newId);

      setNewDep({ firstName: "", lastName: "", dob: "", relationship: "" });
      setAddOpen(false);
      setToast({ type: "success", msg: "Dependent added." });
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message ?? "Failed to add dependent." });
    } finally {
      setSaving(false);
    }
  }

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
  const handleSaveDirectDeposit = async (values: DirectDepositValues) =>
    postJson("/api/direct-deposit", values, "Failed to save direct deposit");

  const handleSaveEducation = async (
    values: EducationCreditsAndDeductionsValues
  ) =>
    postJson(
      "/api/education-credits",
      values,
      "Failed to save education credit info"
    );

  const handleSaveHOH = async (values: HeadOfHouseholdDocumentationValues) =>
    postJson(
      "/api/head-of-household-documentation",
      values,
      "Failed to save HOH documentation"
    );

  const handleSaveIdentification = async (
    values: IdentificationForTaxpayerAndSpouseValues
  ) =>
    postJson("/api/identification", values, "Failed to save identification info");

  const handleSaveEstimated = async (
    values: EstimatedFederalTaxPaymentsValues
  ) =>
    postJson(
      "/api/estimated-tax-payments",
      values,
      "Failed to save estimated tax payments"
    );

  const handleSaveEstimatedState = async (
    values: EstimatedStateTaxPaymentsValues
  ) =>
    postJson(
      "/api/estimated-state-tax-payments",
      values,
      "Failed to save estimated state tax payments"
    );

  const handleSaveIncomeDocs = async (
    values: IncomeDocumentationAssistanceValues
  ) =>
    postJson(
      "/api/income-documentation",
      values,
      "Failed to save income documentation"
    );

  const handleSaveQualChild = async (values: QualifyingChildAssistanceValues) =>
    postJson(
      "/api/qualifying-children",
      values,
      "Failed to save qualifying child info"
    );

  const handleSaveForeignAccountAndDigital = async (
    values: ForeignAccountAndDigitalAssetsValues
  ) =>
    postJson(
      "/api/foreign-accounts-digital-assets",
      values,
      "Failed to save foreign account/digital asset info"
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            <TabsList
              className="
                h-auto w-full
                grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6
                gap-1
                rounded-xl bg-white p-1 ring-1 ring-slate-200
              "
            >
              {[
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
              ].map((t) => (
                <TabsTrigger key={t.key} value={t.key} className={tabTriggerClass}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ---------------- Dependents ---------------- */}
            <TabsContent value="dependent" className="mt-5 space-y-4">
              {depsList.length ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-800">
                        Select dependent
                      </div>

                      <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            disabled={saving}
                          >
                            Add dependent
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="rounded-2xl">
                          <DialogHeader>
                            <DialogTitle>Add a dependent</DialogTitle>
                          </DialogHeader>

                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>First name</Label>
                                <Input
                                  value={newDep.firstName}
                                  onChange={(e) =>
                                    setNewDep((p) => ({
                                      ...p,
                                      firstName: e.target.value,
                                    }))
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label>Last name</Label>
                                <Input
                                  value={newDep.lastName}
                                  onChange={(e) =>
                                    setNewDep((p) => ({
                                      ...p,
                                      lastName: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Date of birth</Label>
                                <Input
                                  type="date"
                                  value={newDep.dob}
                                  onChange={(e) =>
                                    setNewDep((p) => ({
                                      ...p,
                                      dob: e.target.value,
                                    }))
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label>Relationship</Label>
                                <Input
                                  placeholder="Child, stepchild, etc."
                                  value={newDep.relationship}
                                  onChange={(e) =>
                                    setNewDep((p) => ({
                                      ...p,
                                      relationship: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <Button
                              type="button"
                              className="w-full rounded-xl text-white hover:opacity-90"
                              style={brandBar}
                              disabled={
                                saving ||
                                !newDep.firstName.trim() ||
                                !newDep.lastName.trim() ||
                                !newDep.dob ||
                                !newDep.relationship.trim()
                              }
                              onClick={createDependentOnSamePage}
                            >
                              Create dependent
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                            <SelectItem key={d.dependentId} value={d.dependentId}>
                              {d.values?.firstName} {d.values?.lastName} (
                              {String(d.values?.dob ?? "").slice(0, 10)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DependentQuestionnaire dependentId={activeDependentId} />
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div>No dependents found yet. Add a dependent to begin.</div>

                  <div className="mt-3">
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" className="rounded-xl" disabled={saving}>
                          Add dependent
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="rounded-2xl">
                        <DialogHeader>
                          <DialogTitle>Add a dependent</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
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
                          </div>

                          <div className="grid grid-cols-2 gap-3">
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
                              <Input
                                placeholder="Child, stepchild, etc."
                                value={newDep.relationship}
                                onChange={(e) =>
                                  setNewDep((p) => ({
                                    ...p,
                                    relationship: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <Button
                            type="button"
                            className="w-full rounded-xl text-white hover:opacity-90"
                            style={brandBar}
                            disabled={
                              saving ||
                              !newDep.firstName.trim() ||
                              !newDep.lastName.trim() ||
                              !newDep.dob ||
                              !newDep.relationship.trim()
                            }
                            onClick={createDependentOnSamePage}
                          >
                            Create dependent
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
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
                        useDirectDeposit: prefill.directDeposit.useDirectDeposit,
                        accountHolderName: prefill.directDeposit.accountHolderName,
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

            {/* ---------------- Education ---------------- */}
            <TabsContent value="education" className="mt-5">
              <EducationCreditsAndDeductions
                onSave={wrapSave(handleSaveEducation)}
                initialValues={prefill.educationCredits ?? undefined}
              />
            </TabsContent>

            {/* ---------------- HOH ---------------- */}
            <TabsContent value="hoh" className="mt-5">
              <HeadOfHouseholdDocumentation
                onSave={wrapSave(handleSaveHOH)}
                initialValues={prefill.headOfHouseholdDocs ?? undefined}
              />
            </TabsContent>

            {/* ---------------- Identification ---------------- */}
            <TabsContent value="identification" className="mt-5">
              <IdentificationForTaxpayerAndSpouse
                onSave={wrapSave(handleSaveIdentification)}
                initialValues={prefill.identification ?? undefined}
              />
            </TabsContent>

            {/* ---------------- Estimated Federal ---------------- */}
            <TabsContent value="estimated" className="mt-5">
              <EstimatedFederalTaxPayments
                onSave={wrapSave(handleSaveEstimated)}
                initialValues={prefill.estimatedTaxPayments ?? undefined}
              />
            </TabsContent>

            {/* ---------------- Estimated State ---------------- */}
            <TabsContent value="estimatedState" className="mt-5">
              <EstimatedStateTaxPayments
                onSave={wrapSave(handleSaveEstimatedState)}
                initialValues={prefill.estimatedStateTaxPayments ?? undefined}
              />
            </TabsContent>

            {/* ---------------- Income Docs ---------------- */}
            <TabsContent value="incomeDocs" className="mt-5">
              <IncomeDocumentationAssistance
                onSave={wrapSave(handleSaveIncomeDocs)}
                initialValues={prefill.incomeDocumentation ?? undefined}
              />
            </TabsContent>

            {/* ---------------- Qualifying Child ---------------- */}
            <TabsContent value="qualChild" className="mt-5">
              <QualifyingChildAssistance
                onSave={wrapSave(handleSaveQualChild)}
                initialValues={prefill.qualifyingChildren ?? undefined}
              />
            </TabsContent>

            {/* ---------------- Foreign / Digital Assets ---------------- */}
            <TabsContent value="foreignAssets" className="mt-5">
              <ForeignAccountAndDigitalAssets
                onSave={wrapSave(handleSaveForeignAccountAndDigital)}
                initialValues={prefill.foreignAccountsDigitalAssets ?? undefined}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
