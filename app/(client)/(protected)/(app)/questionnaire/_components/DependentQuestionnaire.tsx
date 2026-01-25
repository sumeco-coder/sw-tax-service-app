// app/(client)/(protected)/(app)/questionnaire/_components/DependentQuestionnaire.tsx
"use client";

import * as React from "react";
import {
  useForm,
  Controller,
  type ControllerRenderProps,
  type SubmitHandler,
  type Resolver,
} from "react-hook-form";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import ChildcareExpenseSection from "./ChildcareExpenseSection";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

const FieldRow = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
);

const SwitchRow = ({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean | undefined;
  onCheckedChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-3">
    <Label className="text-sm font-medium text-slate-800">{label}</Label>
    <Switch checked={!!checked} onCheckedChange={onCheckedChange} />
  </div>
);

function digitsOnly(v: string, maxLen: number) {
  return v.replace(/\D/g, "").slice(0, maxLen);
}

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

const YESNO = ["yes", "no"] as const;
const YESNO_NA = ["yes", "no", "na"] as const;

// Page 6 docs
const RESIDENCY_DOCS = [
  { value: "school_records", label: "School records or statement" },
  {
    value: "landlord_statement",
    label: "Landlord or property management statement",
  },
  {
    value: "healthcare_provider_statement",
    label: "Healthcare provider statement",
  },
  { value: "medical_records", label: "Medical records" },
  { value: "childcare_provider_records", label: "Childcare provider records" },
  { value: "placement_agency_statement", label: "Placement agency statement" },
  {
    value: "social_services_records",
    label: "Social services records or statement",
  },
  { value: "place_of_worship_statement", label: "Place of worship statement" },
  {
    value: "indian_tribal_official_statement",
    label: "Indian tribal official statement",
  },
  { value: "employer_statement", label: "Employer statement" },
  {
    value: "did_not_rely_notes",
    label: "Did not rely on any documents, made notes in file",
  },
  { value: "did_not_rely", label: "Did not rely on any documents" },
  { value: "other", label: "Other" },
] as const;

const DISABILITY_DOCS = [
  { value: "doctor_statement", label: "Doctor statement" },
  {
    value: "other_healthcare_provider_statement",
    label: "Other healthcare provider statement",
  },
  {
    value: "social_services_program_statement",
    label: "Social services agency or program statement",
  },
  {
    value: "did_not_rely_notes",
    label: "Did not rely on any documents, made notes in file",
  },
  { value: "did_not_rely", label: "Did not rely on any documents" },
  { value: "other", label: "Other" },
] as const;

const EXCLUSIVE = new Set(["did_not_rely_notes", "did_not_rely"]);

function toggleMulti(current: string[], value: string) {
  const cur = Array.isArray(current) ? current : [];
  const isOn = cur.includes(value);

  if (isOn) return cur.filter((x) => x !== value);
  if (EXCLUSIVE.has(value)) return [value];
  return [...cur.filter((x) => !EXCLUSIVE.has(x)), value];
}

const schema = z
  .object({
    // meta (not shown) - so SSN requirement can be skipped if already on file
    ssnOnFile: z.boolean().default(false),

    // Page 1
    firstName: z.string().trim().min(1, "Required"),
    middleName: z.string().trim().default(""),
    lastName: z.string().trim().min(1, "Required"),
    dob: z
      .string()
      .min(1, "Required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use YYYY-MM-DD" }),
    relationship: z.string().min(1, "Required"),

    ssn: z
      .string()
      .default("")
      .transform((v) => digitsOnly(String(v ?? ""), 9))
      .refine((v) => v === "" || v.length === 9, { message: "Enter 9 digits" }),

    monthsInHome: z
      .string()
      .default("12")
      .refine((v) => /^(?:[0-9]|1[0-2])$/.test(v), { message: "0–12 only" }),

    appliedButNotReceived: z.boolean().default(false),
    isStudent: z.boolean().default(false),
    isDisabled: z.boolean().default(false),

    // Page 2
    over18Under24Student: z.boolean().default(false),
    doesNotQualifyEIC: z.boolean().default(false),

    livedWithTaxpayer: z.boolean().default(false),
    notLiveDueToDivorce: z.boolean().default(false),
    otherTypeDependent: z.boolean().default(false),

    notDependent: z.boolean().default(false),
    notDependentHOHQualifier: z.boolean().default(false),
    notDependentQSSQualifier: z.boolean().default(false),

    doNotUpdateNextYear: z.boolean().default(false),
    itinSpecialCircumstance: z.boolean().default(false),

    ipPin: z
      .string()
      .trim()
      .default("")
      .refine((v) => v === "" || /^\d{6}$/.test(v), {
        message: "IP PIN must be 6 digits",
      }),

    // Page 3
    childcareExpensesPaid: z.string().trim().default(""),
    childcareProvidedByEmployer: z.string().trim().default(""),
    includeOn2441NoExpenses: z.boolean().default(false),

    // Page 4
    claimingEicOrCtcForThisDependent: z.enum(YESNO).default("no"),

    ddq_unmarriedOrQualifyingMarried: z.enum(YESNO).default("no"),
    ddq_livedWithTaxpayerMoreThanHalfYearUS: z.enum(YESNO).default("yes"),

    ddq_parentNotClaimingAskedAndDocumented: z.enum(YESNO_NA).default("na"),

    ddq_couldAnotherPersonClaim: z.enum(YESNO).default("no"),
    ddq_relationshipToOther: z.string().trim().default(""),
    ddq_tiebreakerQualifyingChild: z.enum(YESNO_NA).default("na"),

    ddq_qualifyingPersonCitizenNationalResidentUS: z.enum(YESNO).default("no"),

    ddq_explainedNoACTCIfNotLivedHalfYear: z.enum(YESNO_NA).default("na"),
    ddq_explainedDivorce8332Rules: z.enum(YESNO_NA).default("na"),

    // Page 6
    ddq_residencyDocs: z.array(z.string()).default([]),
    ddq_residencyOtherText: z.string().trim().default(""),
    ddq_disabilityDocs: z.array(z.string()).default([]),
    ddq_disabilityOtherText: z.string().trim().default(""),
  })
  .superRefine((data, ctx) => {
    // ✅ SSN is required ONLY if:
    // - not applied
    // - and ssn empty
    // - and not already on file
    if (!data.appliedButNotReceived && data.ssn === "" && !data.ssnOnFile) {
      ctx.addIssue({
        code: "custom",
        path: ["ssn"],
        message: "Enter SSN (9 digits) or mark applied-but-not-received.",
      });
    }

    if (data.claimingEicOrCtcForThisDependent !== "yes") return;

    if (
      data.ddq_couldAnotherPersonClaim === "yes" &&
      !data.ddq_relationshipToOther.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ddq_relationshipToOther"],
        message: "Please describe the relationship to the other person.",
      });
    }

    if (
      data.ddq_residencyDocs.includes("other") &&
      !data.ddq_residencyOtherText.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ddq_residencyOtherText"],
        message: "Please describe the other residency document.",
      });
    }

    if (
      data.ddq_disabilityDocs.includes("other") &&
      !data.ddq_disabilityOtherText.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ddq_disabilityOtherText"],
        message: "Please describe the other disability document.",
      });
    }
  });

export type DependentQuestionnaireValues = z.infer<typeof schema>;

const defaultValues: DependentQuestionnaireValues = {
  ssnOnFile: false,

  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  relationship: "",
  ssn: "",
  monthsInHome: "12",
  appliedButNotReceived: false,
  isStudent: false,
  isDisabled: false,

  over18Under24Student: false,
  doesNotQualifyEIC: false,

  livedWithTaxpayer: false,
  notLiveDueToDivorce: false,
  otherTypeDependent: false,

  notDependent: false,
  notDependentHOHQualifier: false,
  notDependentQSSQualifier: false,

  doNotUpdateNextYear: false,
  itinSpecialCircumstance: false,

  ipPin: "",

  childcareExpensesPaid: "",
  childcareProvidedByEmployer: "",
  includeOn2441NoExpenses: false,

  claimingEicOrCtcForThisDependent: "no",
  ddq_unmarriedOrQualifyingMarried: "no",
  ddq_livedWithTaxpayerMoreThanHalfYearUS: "yes",
  ddq_parentNotClaimingAskedAndDocumented: "na",
  ddq_couldAnotherPersonClaim: "no",
  ddq_relationshipToOther: "",
  ddq_tiebreakerQualifyingChild: "na",
  ddq_qualifyingPersonCitizenNationalResidentUS: "no",
  ddq_explainedNoACTCIfNotLivedHalfYear: "na",
  ddq_explainedDivorce8332Rules: "na",

  ddq_residencyDocs: [],
  ddq_residencyOtherText: "",
  ddq_disabilityDocs: [],
  ddq_disabilityOtherText: "",
};

function YesNoRadio({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Label className="text-slate-700">{label}</Label>
      <RadioGroup
        className="mt-2 flex gap-6"
        value={value}
        onValueChange={onChange}
        aria-disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id={`${label}-yes`} disabled={disabled} />
          <Label htmlFor={`${label}-yes`}>Yes</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id={`${label}-no`} disabled={disabled} />
          <Label htmlFor={`${label}-no`}>No</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

function YesNoNaRadio({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Label className="text-slate-700">{label}</Label>
      <RadioGroup
        className="mt-2 flex gap-6"
        value={value}
        onValueChange={onChange}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id={`${label}-yes`} disabled={disabled} />
          <Label htmlFor={`${label}-yes`}>Yes</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id={`${label}-no`} disabled={disabled} />
          <Label htmlFor={`${label}-no`}>No</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="na" id={`${label}-na`} disabled={disabled} />
          <Label htmlFor={`${label}-na`}>N/A</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

export default function DependentQuestionnaire({
  dependentId,
  onSave,
}: {
  dependentId: string;
  onSave?: (values: DependentQuestionnaireValues) => Promise<void> | void;
}) {
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  const [saveErr, setSaveErr] = React.useState<string | null>(null);
  const [ssnLast4, setSsnLast4] = React.useState<string | null>(null);

  // ✅ autosave UI state
  const [autoSaving, setAutoSaving] = React.useState(false);

  // ✅ autosave refs
  const didLoadRef = React.useRef(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = React.useRef<string>("");

  const endpoint = React.useMemo(
    () => `/api/dependents/${dependentId}/questionnaire`,
    [dependentId],
  );

  const resolver: Resolver<DependentQuestionnaireValues> = zodResolver(
    schema,
  ) as unknown as Resolver<DependentQuestionnaireValues>;

  // ✅ create the form FIRST (so reset exists)
  const form = useForm<DependentQuestionnaireValues>({
    resolver,
    defaultValues,
    mode: "onBlur",
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  // ✅ load saved values
  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(endpoint, { method: "GET" });
        if (!res.ok) return;

        const data = await res.json().catch(() => null);
        if (!alive || !data?.values) return;

        const ssnOnFile = Boolean(data?.meta?.ssnOnFile);
        const last4 = (data?.meta?.ssnLast4 ?? null) as string | null;

        setSsnLast4(last4);

        // never hydrate SSN into the input
        const hydrated = {
          ...defaultValues,
          ...data.values,
          ssnOnFile,
          ssn: "",
        };

        reset(hydrated);

        // prevent immediate autosave after hydration
        const { ssnOnFile: _m, ssn: _s, ...snap } = hydrated as any;
        lastSavedRef.current = JSON.stringify(snap);
      } catch {
        // ignore
      } finally {
        // mark load complete no matter what
        didLoadRef.current = true;
      }
    })();

    return () => {
      alive = false;
    };
  }, [endpoint, reset]);

  // ✅ Save BOTH: core + questionnaire (used by manual save + autosave)
  const saveDraft = React.useCallback(
    async (values: DependentQuestionnaireValues) => {
      const ssnDigits = digitsOnly(String(values.ssn ?? ""), 9);

      // Never send SSN when applied=true (server will throw)
      const payload: DependentQuestionnaireValues = {
        ...values,
        ssn: values.appliedButNotReceived ? "" : ssnDigits,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as any)?.error || "Failed to save dependent questionnaire",
        );
      }

      // ✅ keep meta accurate + clear ssn input after successful save
      if (payload.appliedButNotReceived) {
        setValue("ssnOnFile", false, { shouldDirty: false });
        setValue("ssn", "", { shouldDirty: false });
      } else if (payload.ssn && payload.ssn.length === 9) {
        setValue("ssnOnFile", true, { shouldDirty: false });
        setValue("ssn", "", { shouldDirty: false });
      }
    },
    [endpoint, setValue],
  );

  // ✅ autosave: watch whole form
  const allValues = watch();

  React.useEffect(() => {
    if (!didLoadRef.current) return;
    if (!isDirty) return;
    if (isSubmitting) return;

    // exclude meta + ssn from snapshot key
    const { ssnOnFile: _ssnOnFile, ssn: _ssn, ...snap } = allValues as any;
    const key = JSON.stringify(snap);

    // ✅ SSN typing should trigger autosave even though it's excluded from key
    const ssnDigits = digitsOnly(String(allValues.ssn ?? ""), 9);
    const shouldSaveSsn =
      !allValues.appliedButNotReceived && ssnDigits.length === 9;

    if (key === lastSavedRef.current && !shouldSaveSsn) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setAutoSaving(true);
      setSaveErr(null);

      try {
        await saveDraft(allValues as DependentQuestionnaireValues);

        // ✅ IMPORTANT: only update snapshot key from snap (not including SSN)
        lastSavedRef.current = key;

        setSaveMsg("✅ Auto-saved.");
      } catch (e: any) {
        setSaveErr(e?.message ?? "Auto-save failed");
      } finally {
        setAutoSaving(false);
      }
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [allValues, isDirty, isSubmitting, saveDraft]);

  // ----- watches used for UI logic -----
  const applied = watch("appliedButNotReceived");
  const claimingCredits = watch("claimingEicOrCtcForThisDependent");
  const rel = watch("relationship");
  const couldAnother = watch("ddq_couldAnotherPersonClaim");
  const livedHalf = watch("ddq_livedWithTaxpayerMoreThanHalfYearUS");
  const notLiveDueToDivorce = watch("notLiveDueToDivorce");
  const ssnOnFile = watch("ssnOnFile");

  // ✅ keep downstream fields consistent
  React.useEffect(() => {
    if (claimingCredits !== "yes") {
      setValue("ddq_parentNotClaimingAskedAndDocumented", "na", {
        shouldDirty: false,
      });
      setValue("ddq_tiebreakerQualifyingChild", "na", { shouldDirty: false });
      setValue("ddq_explainedNoACTCIfNotLivedHalfYear", "na", {
        shouldDirty: false,
      });
      setValue("ddq_explainedDivorce8332Rules", "na", { shouldDirty: false });
      setValue("ddq_relationshipToOther", "", { shouldDirty: false });

      setValue("ddq_residencyDocs", [], { shouldDirty: false });
      setValue("ddq_residencyOtherText", "", { shouldDirty: false });
      setValue("ddq_disabilityDocs", [], { shouldDirty: false });
      setValue("ddq_disabilityOtherText", "", { shouldDirty: false });
      return;
    }

    // ✅ (fix) match your REL_OPTIONS
    if (rel === "Son" || rel === "Daughter" || rel === "Stepchild") {
      setValue("ddq_parentNotClaimingAskedAndDocumented", "na", {
        shouldDirty: false,
      });
    }

    if (couldAnother === "no") {
      setValue("ddq_tiebreakerQualifyingChild", "na", { shouldDirty: false });
      setValue("ddq_relationshipToOther", "", { shouldDirty: false });
    }

    if (livedHalf === "yes") {
      setValue("ddq_explainedNoACTCIfNotLivedHalfYear", "na", {
        shouldDirty: false,
      });
    }

    if (!notLiveDueToDivorce) {
      setValue("ddq_explainedDivorce8332Rules", "na", { shouldDirty: false });
    }
  }, [
    claimingCredits,
    rel,
    couldAnother,
    livedHalf,
    notLiveDueToDivorce,
    setValue,
  ]);

  // ✅ single submit handler (manual save)
  const onSubmit: SubmitHandler<DependentQuestionnaireValues> = async (
    values,
  ) => {
    setSaveMsg(null);
    setSaveErr(null);

    try {
      if (onSave) {
        await onSave(values);
        setSaveMsg("✅ Saved.");
        return;
      }

      await saveDraft(values);
      setSaveMsg("✅ Saved.");

      // optional: clear SSN input after manual save
      setValue("ssn", "", { shouldDirty: false });
    } catch (e: any) {
      setSaveErr(e?.message ?? "Failed to save dependent questionnaire");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
      onChange={() => {
        if (saveMsg) setSaveMsg(null);
        if (saveErr) setSaveErr(null);
      }}
    >
      <Tabs defaultValue="page1">
        <TabsList className="!grid !h-auto w-full grid-cols-1 gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <TabsTrigger
            value="page1"
            className="w-full !whitespace-normal rounded-lg px-3 py-2 text-center text-xs leading-tight sm:text-sm data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]"
          >
            Page 1 – Dependent Details
          </TabsTrigger>

          <TabsTrigger
            value="page2"
            className="w-full !whitespace-normal rounded-lg px-3 py-2 text-center text-xs leading-tight sm:text-sm data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]"
          >
            Page 2 – Eligibility & Notes
          </TabsTrigger>

          <TabsTrigger
            value="page3"
            className="w-full !whitespace-normal rounded-lg px-3 py-2 text-center text-xs leading-tight sm:text-sm data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]"
          >
            Page 3 – Childcare & Form 2441
          </TabsTrigger>

          <TabsTrigger
            value="page4"
            className="w-full !whitespace-normal rounded-lg px-3 py-2 text-center text-xs leading-tight sm:text-sm data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]"
          >
            Page 4 – Credits
          </TabsTrigger>

          <TabsTrigger
            value="page6"
            className="w-full !whitespace-normal rounded-lg px-3 py-2 text-center text-xs leading-tight sm:text-sm data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]"
          >
            Page 6 – Docs
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Page 1 ---------------- */}
        <TabsContent value="page1">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">
                Dependent Details
              </CardTitle>
              <div
                className="mt-2 h-1 w-24 rounded-full"
                style={brandGradient}
              />
            </CardHeader>

            <CardContent className="space-y-4">
              <FieldRow>
                <div>
                  <Label className="text-slate-700">First Name</Label>
                  <Input className="mt-1" {...register("firstName")} />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-slate-700">
                    Middle Name (optional)
                  </Label>
                  <Input className="mt-1" {...register("middleName")} />
                </div>
              </FieldRow>

              <FieldRow>
                <div>
                  <Label className="text-slate-700">Last Name</Label>
                  <Input className="mt-1" {...register("lastName")} />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-slate-700">Date of Birth</Label>
                  <Input className="mt-1" type="date" {...register("dob")} />
                  {errors.dob && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.dob.message}
                    </p>
                  )}
                </div>
              </FieldRow>

              <FieldRow>
                <div>
                  <Label className="text-slate-700">Relationship</Label>
                  <Controller
                    control={control}
                    name="relationship"
                    render={({
                      field,
                    }: {
                      field: ControllerRenderProps<
                        DependentQuestionnaireValues,
                        "relationship"
                      >;
                    }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="mt-1">
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
                    )}
                  />
                  {errors.relationship && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.relationship.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-slate-700">Months in Home</Label>
                  <Controller
                    control={control}
                    name="monthsInHome"
                    render={({
                      field,
                    }: {
                      field: ControllerRenderProps<
                        DependentQuestionnaireValues,
                        "monthsInHome"
                      >;
                    }) => (
                      <Select
                        value={field.value ?? "12"}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select months" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 13 }).map((_, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.monthsInHome && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.monthsInHome.message}
                    </p>
                  )}
                </div>
              </FieldRow>

              <FieldRow>
                <div>
                  <Label className="text-slate-700">SSN (9 digits)</Label>

                  <Controller
                    control={control}
                    name="ssn"
                    render={({ field }) => (
                      <Input
                        className="mt-1"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder={
                          applied
                            ? "Applied (no SSN yet)"
                            : ssnOnFile
                              ? ssnLast4
                                ? `SSN on file (ending ${ssnLast4}) — leave blank unless updating`
                                : "SSN already on file (leave blank unless updating)"
                              : "9 digits"
                        }
                        disabled={applied}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(digitsOnly(e.target.value, 9))
                        }
                      />
                    )}
                  />

                  {errors.ssn && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.ssn.message}
                    </p>
                  )}
                  {ssnOnFile && !applied ? (
                    <p className="mt-1 text-xs text-slate-500">
                      SSN is already saved securely. Leave blank unless you need
                      to change it.
                    </p>
                  ) : null}
                </div>

                <Controller
                  control={control}
                  name="appliedButNotReceived"
                  render={({ field }) => (
                    <SwitchRow
                      label="SSN/ITIN applied for but not yet received"
                      checked={field.value}
                      onCheckedChange={(v) => {
                        field.onChange(v);
                        if (v)
                          setValue("ssn", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                      }}
                    />
                  )}
                />
              </FieldRow>

              <FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name="isStudent"
                    render={({ field }) => (
                      <SwitchRow
                        label="Student"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="isDisabled"
                    render={({ field }) => (
                      <SwitchRow
                        label="Disabled"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <div />
              </FieldRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Page 2 ---------------- */}
        <TabsContent value="page2">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">
                Eligibility & Notes
              </CardTitle>
              <div
                className="mt-2 h-1 w-24 rounded-full"
                style={brandGradient}
              />
            </CardHeader>

            <CardContent className="space-y-4">
              <FieldRow>
                <Controller
                  control={control}
                  name="over18Under24Student"
                  render={({ field }) => (
                    <SwitchRow
                      label="Over 18 but under 24 and student?"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="doesNotQualifyEIC"
                  render={({ field }) => (
                    <SwitchRow
                      label="Does not qualify for EIC"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </FieldRow>

              <FieldRow>
                <Controller
                  control={control}
                  name="livedWithTaxpayer"
                  render={({ field }) => (
                    <SwitchRow
                      label="Dependent lived with taxpayer"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="notLiveDueToDivorce"
                  render={({ field }) => (
                    <SwitchRow
                      label="Did NOT live with me due to divorce/separation"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </FieldRow>

              <FieldRow>
                <Controller
                  control={control}
                  name="otherTypeDependent"
                  render={({ field }) => (
                    <SwitchRow
                      label="Other type of dependent"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="notDependent"
                  render={({ field }) => (
                    <SwitchRow
                      label="Not a dependent"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </FieldRow>

              <FieldRow>
                <Controller
                  control={control}
                  name="notDependentHOHQualifier"
                  render={({ field }) => (
                    <SwitchRow
                      label="Not dependent – HOH qualifier"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="notDependentQSSQualifier"
                  render={({ field }) => (
                    <SwitchRow
                      label="Not dependent – QSS qualifier"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </FieldRow>

              <FieldRow>
                <Controller
                  control={control}
                  name="doNotUpdateNextYear"
                  render={({ field }) => (
                    <SwitchRow
                      label="Do NOT update dependent to next year"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="itinSpecialCircumstance"
                  render={({ field }) => (
                    <SwitchRow
                      label="ITIN special circumstance"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </FieldRow>

              <div>
                <Label className="text-slate-700">IP PIN (6 digits)</Label>

                <Controller
                  control={control}
                  name="ipPin"
                  render={({ field }) => (
                    <Input
                      className="mt-1"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Optional"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(digitsOnly(e.target.value, 6))
                      }
                    />
                  )}
                />

                {errors.ipPin && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.ipPin.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Page 3 ---------------- */}
        <TabsContent value="page3">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">
                Childcare & Form 2441
              </CardTitle>
              <div
                className="mt-2 h-1 w-24 rounded-full"
                style={brandGradient}
              />
            </CardHeader>

            <CardContent className="space-y-4">
              <ChildcareExpenseSection
                control={control as any}
                register={register}
                setValue={setValue}
                errors={errors as any}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Page 4 ---------------- */}
        <TabsContent value="page4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">
                EIC / CTC Due Diligence
              </CardTitle>
              <div
                className="mt-2 h-1 w-24 rounded-full"
                style={brandGradient}
              />
              <p className="mt-3 text-sm text-slate-600">
                If either EIC or Child Tax Credit is claimed for this dependent,
                complete this section.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <Controller
                control={control}
                name="claimingEicOrCtcForThisDependent"
                render={({ field }) => (
                  <YesNoRadio
                    label="Is EIC or (A)CTC being claimed for this dependent?"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              <div
                className={
                  claimingCredits === "yes"
                    ? "space-y-4"
                    : "opacity-60 pointer-events-none space-y-4"
                }
              >
                <Controller
                  control={control}
                  name="ddq_unmarriedOrQualifyingMarried"
                  render={({ field }) => (
                    <YesNoRadio
                      label="Is either true: dependent is unmarried OR married, claimable as dependent, and not filing joint return (except refund)?"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="ddq_livedWithTaxpayerMoreThanHalfYearUS"
                  render={({ field }) => (
                    <YesNoRadio
                      label="Did the dependent live with the taxpayer in the U.S. for more than half of the year?"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="ddq_parentNotClaimingAskedAndDocumented"
                  render={({ field }) => (
                    <YesNoNaRadio
                      label="If this is NOT the taxpayer’s son/daughter: did you ask why the parent was not claiming the child and document the answer?"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="ddq_couldAnotherPersonClaim"
                  render={({ field }) => (
                    <YesNoRadio
                      label="Could another person qualify to claim this dependent?"
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        if (v === "no") {
                          setValue("ddq_relationshipToOther", "", {
                            shouldDirty: true,
                          });
                          setValue("ddq_tiebreakerQualifyingChild", "na", {
                            shouldDirty: true,
                          });
                        }
                      }}
                    />
                  )}
                />

                {couldAnother === "yes" && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <Label className="text-slate-700">
                      If Yes: Dependent’s relationship to the other person
                    </Label>
                    <Input
                      className="mt-1"
                      {...register("ddq_relationshipToOther")}
                    />
                    {errors.ddq_relationshipToOther && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.ddq_relationshipToOther.message}
                      </p>
                    )}
                  </div>
                )}

                <Controller
                  control={control}
                  name="ddq_tiebreakerQualifyingChild"
                  render={({ field }) => (
                    <YesNoNaRadio
                      label="If the tiebreaker rules apply, would the dependent be treated as your qualifying child?"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={couldAnother !== "yes"}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="ddq_qualifyingPersonCitizenNationalResidentUS"
                  render={({ field }) => (
                    <YesNoRadio
                      label="Is the qualifying person the taxpayer’s dependent who is a citizen, national, or resident of the United States?"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="ddq_explainedNoACTCIfNotLivedHalfYear"
                  render={({ field }) => (
                    <YesNoNaRadio
                      label="Did you explain they may not claim the (A)CTC if they did not live with the child for more than half the year?"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={livedHalf === "yes"}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="ddq_explainedDivorce8332Rules"
                  render={({ field }) => (
                    <YesNoNaRadio
                      label="Did you explain the rules for divorced/separated parents, including Form 8332 (or similar) requirements?"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!notLiveDueToDivorce}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Page 6 ---------------- */}
        <TabsContent value="page6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">
                Documents (EIC / CTC)
              </CardTitle>
              <div
                className="mt-2 h-1 w-24 rounded-full"
                style={brandGradient}
              />
              <p className="mt-3 text-sm text-slate-600">
                Which documents (if any) do you have to determine eligibility?
                Check all that apply.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div
                className={
                  claimingCredits === "yes"
                    ? "space-y-6"
                    : "opacity-60 pointer-events-none space-y-6"
                }
              >
                {/* Residency docs */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Residency of Qualifying Child
                  </p>

                  <Controller
                    control={control}
                    name="ddq_residencyDocs"
                    render={({ field }) => {
                      const current = Array.isArray(field.value)
                        ? field.value
                        : [];
                      const hasOther = current.includes("other");

                      return (
                        <div className="mt-3 space-y-3">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {RESIDENCY_DOCS.map((opt) => {
                              const checked = current.includes(opt.value);
                              return (
                                <label
                                  key={opt.value}
                                  className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 ${
                                    checked
                                      ? "ring-1 ring-[#E72B69]/25 bg-white"
                                      : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 accent-[#E72B69]"
                                    checked={checked}
                                    onChange={() => {
                                      const next = toggleMulti(
                                        current,
                                        opt.value,
                                      );
                                      field.onChange(next);

                                      if (
                                        (opt.value === "other" && checked) ||
                                        (EXCLUSIVE.has(opt.value) && !checked)
                                      ) {
                                        setValue("ddq_residencyOtherText", "", {
                                          shouldDirty: true,
                                        });
                                      }
                                    }}
                                  />
                                  <span>{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>

                          {hasOther && (
                            <div>
                              <Label className="text-slate-700">
                                Other (describe)
                              </Label>
                              <Input
                                className="mt-1"
                                {...register("ddq_residencyOtherText")}
                              />
                              {errors.ddq_residencyOtherText && (
                                <p className="mt-1 text-xs text-red-600">
                                  {errors.ddq_residencyOtherText.message}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>

                {/* Disability docs */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Disability of Qualifying Child
                  </p>

                  <Controller
                    control={control}
                    name="ddq_disabilityDocs"
                    render={({ field }) => {
                      const current = Array.isArray(field.value)
                        ? field.value
                        : [];
                      const hasOther = current.includes("other");

                      return (
                        <div className="mt-3 space-y-3">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {DISABILITY_DOCS.map((opt) => {
                              const checked = current.includes(opt.value);
                              return (
                                <label
                                  key={opt.value}
                                  className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 ${
                                    checked
                                      ? "ring-1 ring-[#E72B69]/25 bg-white"
                                      : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 accent-[#E72B69]"
                                    checked={checked}
                                    onChange={() => {
                                      const next = toggleMulti(
                                        current,
                                        opt.value,
                                      );
                                      field.onChange(next);

                                      if (
                                        (opt.value === "other" && checked) ||
                                        (EXCLUSIVE.has(opt.value) && !checked)
                                      ) {
                                        setValue(
                                          "ddq_disabilityOtherText",
                                          "",
                                          { shouldDirty: true },
                                        );
                                      }
                                    }}
                                  />
                                  <span>{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>

                          {hasOther && (
                            <div>
                              <Label className="text-slate-700">
                                Other (describe)
                              </Label>
                              <Input
                                className="mt-1"
                                {...register("ddq_disabilityOtherText")}
                              />
                              {errors.ddq_disabilityOtherText && (
                                <p className="mt-1 text-xs text-red-600">
                                  {errors.ddq_disabilityOtherText.message}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Selecting “Did not rely…” clears other selections in that
                  section.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col items-end gap-2">
        <div className="flex justify-end gap-2">
          <Button
            type="reset"
            variant="outline"
            onClick={() => {
              reset({ ...defaultValues, ssnOnFile, ssn: "" });
              setSaveMsg(null);
              setSaveErr(null);
            }}
            disabled={isSubmitting}
          >
            Reset
          </Button>

          <Button
            type="submit"
            className="text-white hover:opacity-90"
            style={brandGradient}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>

        {autoSaving ? (
          <div className="text-xs text-slate-500">Auto-saving…</div>
        ) : null}
        {saveErr ? <div className="text-sm text-red-600">{saveErr}</div> : null}
        {saveMsg ? <div className="text-sm">{saveMsg}</div> : null}
      </div>
    </form>
  );
}
