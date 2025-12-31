"use client";

import * as React from "react";
import {
  useForm,
  Controller,
  type ControllerRenderProps,
  type SubmitHandler,
  type Resolver,
  useWatch,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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

const US_STATES = [
  { v: "AL", l: "Alabama" },
  { v: "AK", l: "Alaska" },
  { v: "AZ", l: "Arizona" },
  { v: "AR", l: "Arkansas" },
  { v: "CA", l: "California" },
  { v: "CO", l: "Colorado" },
  { v: "CT", l: "Connecticut" },
  { v: "DE", l: "Delaware" },
  { v: "DC", l: "District of Columbia" },
  { v: "FL", l: "Florida" },
  { v: "GA", l: "Georgia" },
  { v: "HI", l: "Hawaii" },
  { v: "ID", l: "Idaho" },
  { v: "IL", l: "Illinois" },
  { v: "IN", l: "Indiana" },
  { v: "IA", l: "Iowa" },
  { v: "KS", l: "Kansas" },
  { v: "KY", l: "Kentucky" },
  { v: "LA", l: "Louisiana" },
  { v: "ME", l: "Maine" },
  { v: "MD", l: "Maryland" },
  { v: "MA", l: "Massachusetts" },
  { v: "MI", l: "Michigan" },
  { v: "MN", l: "Minnesota" },
  { v: "MS", l: "Mississippi" },
  { v: "MO", l: "Missouri" },
  { v: "MT", l: "Montana" },
  { v: "NE", l: "Nebraska" },
  { v: "NV", l: "Nevada" },
  { v: "NH", l: "New Hampshire" },
  { v: "NJ", l: "New Jersey" },
  { v: "NM", l: "New Mexico" },
  { v: "NY", l: "New York" },
  { v: "NC", l: "North Carolina" },
  { v: "ND", l: "North Dakota" },
  { v: "OH", l: "Ohio" },
  { v: "OK", l: "Oklahoma" },
  { v: "OR", l: "Oregon" },
  { v: "PA", l: "Pennsylvania" },
  { v: "RI", l: "Rhode Island" },
  { v: "SC", l: "South Carolina" },
  { v: "SD", l: "South Dakota" },
  { v: "TN", l: "Tennessee" },
  { v: "TX", l: "Texas" },
  { v: "UT", l: "Utah" },
  { v: "VT", l: "Vermont" },
  { v: "VA", l: "Virginia" },
  { v: "WA", l: "Washington" },
  { v: "WV", l: "West Virginia" },
  { v: "WI", l: "Wisconsin" },
  { v: "WY", l: "Wyoming" },
] as const;

const YESNO = ["yes", "no"] as const;

function digitsOnly(v: string, maxLen: number) {
  return String(v ?? "").replace(/\D/g, "").slice(0, maxLen);
}
function moneyOnly(v: string) {
  const raw = String(v ?? "").replace(/[^\d.]/g, "");
  const [a, b] = raw.split(".");
  return [a ?? "", b ?? ""].filter((_, i) => i === 0 || b !== undefined).join(".").slice(0, 20);
}

const DOCS_OPTIONS = [
  "1098-T",
  "Receipts",
  "School Transcripts",
  "Other",
] as const;

const schema = z
  .object({
    // ---------- Page 1 ----------
    studentFirstName: z.string().trim().min(1, "Required"),
    studentLastName: z.string().trim().min(1, "Required"),
    studentSsn: z
      .string()
      .default("")
      .transform((v) => digitsOnly(String(v ?? ""), 9))
      .refine((v) => v.length === 9, { message: "SSN must be 9 digits" }),

    studentState: z.string().min(2, "State is required"),

    hopeOrAotcFourTimesPrior: z.enum(YESNO).default("no"),
    enrolledHalfTimeEligibleProgram: z.enum(YESNO).default("no"),
    completedFirstFourYearsBeforeThisYear: z.enum(YESNO).default("no"),
    convictedFelonyControlledSubstance: z.enum(YESNO).default("no"),

    aotcYearsClaimed: z.enum(["0", "1", "2", "3", "4"]).default("0"),
    pursuingDegree: z.enum(YESNO).default("yes"),

    reqPaidToInstitutionExpenses: z.string().trim().default(""),
    addlNotRequiredExpenses: z.string().trim().default(""),
    taxFreeAssistThisYear: z.string().trim().default(""),
    taxFreeAssistAfterYearBeforeFiled: z.string().trim().default(""),
    refundsBeforePriorReturnFiled: z.string().trim().default(""),

    // ---------- Page 2 ----------
    institutionEin: z
      .string()
      .trim()
      .default("")
      .transform((v) => digitsOnly(v, 9))
      .refine((v) => v === "" || v.length === 9, { message: "EIN must be 9 digits" }),

    institutionName: z.string().trim().default(""),

    instIsForeign: z.boolean().default(false),

    instStreet: z.string().trim().default(""),
    instCity: z.string().trim().default(""),
    instState: z.string().trim().default(""),
    instZip: z.string().trim().default("").transform((v) => digitsOnly(v, 10)),

    instProvince: z.string().trim().default(""),
    instCountry: z.string().trim().default(""),
    instPostalCode: z.string().trim().default(""),

    received1098TThisYear: z.enum(YESNO).default("no"),
    received1098TLastYear: z.enum(YESNO).default("no"),

    docsReliedOn: z.array(z.enum(DOCS_OPTIONS)).default([]),
    docsOtherText: z.string().trim().default(""),

    hasSubstantiation1098TAndReceipts: z.enum(YESNO).default("no"),

    magiAdjustment: z.boolean().default(false),
    dependentOfAnotherButNotClaiming: z.boolean().default(false),
    makeAotcNotRefundable: z.boolean().default(false),
    undergradOnly: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const moneyFields: Array<keyof typeof data> = [
      "reqPaidToInstitutionExpenses",
      "addlNotRequiredExpenses",
      "taxFreeAssistThisYear",
      "taxFreeAssistAfterYearBeforeFiled",
      "refundsBeforePriorReturnFiled",
    ];

    for (const k of moneyFields) {
      const v = String(data[k] ?? "").trim();
      if (!v) continue;
      if (!/^\d+(\.\d{1,2})?$/.test(v)) {
        ctx.addIssue({
          code: "custom",
          path: [k],
          message: "Enter a valid amount (e.g., 1200 or 1200.50)",
        });
      }
    }

    if (data.instIsForeign) {
      if (data.institutionName.trim() && !data.instCountry.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["instCountry"],
          message: "Country is required for foreign institutions",
        });
      }
    } else {
      const started =
        !!data.institutionName.trim() ||
        !!data.instStreet.trim() ||
        !!data.instCity.trim() ||
        !!data.instState.trim() ||
        !!data.instZip.trim() ||
        !!data.institutionEin.trim();

      if (started) {
        if (!data.instStreet.trim()) {
          ctx.addIssue({ code: "custom", path: ["instStreet"], message: "Street is required" });
        }
        if (!data.instCity.trim()) {
          ctx.addIssue({ code: "custom", path: ["instCity"], message: "City is required" });
        }
        if (!data.instState.trim()) {
          ctx.addIssue({ code: "custom", path: ["instState"], message: "State is required" });
        }
        if (!data.instZip.trim() || data.instZip.length < 5) {
          ctx.addIssue({ code: "custom", path: ["instZip"], message: "ZIP is required" });
        }
      }
    }

    const hasOther = (data.docsReliedOn ?? []).includes("Other");
    if (hasOther && !data.docsOtherText.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["docsOtherText"],
        message: "Please describe the 'Other' document",
      });
    }
  });

export type EducationCreditsAndDeductionsValues = z.infer<typeof schema>;

const defaultValues: EducationCreditsAndDeductionsValues = {
  studentFirstName: "",
  studentLastName: "",
  studentSsn: "",
  studentState: "CA",

  hopeOrAotcFourTimesPrior: "no",
  enrolledHalfTimeEligibleProgram: "no",
  completedFirstFourYearsBeforeThisYear: "no",
  convictedFelonyControlledSubstance: "no",

  aotcYearsClaimed: "0",
  pursuingDegree: "yes",

  reqPaidToInstitutionExpenses: "",
  addlNotRequiredExpenses: "",
  taxFreeAssistThisYear: "",
  taxFreeAssistAfterYearBeforeFiled: "",
  refundsBeforePriorReturnFiled: "",

  institutionEin: "",
  institutionName: "",

  instIsForeign: false,

  instStreet: "",
  instCity: "",
  instState: "",
  instZip: "",

  instProvince: "",
  instCountry: "",
  instPostalCode: "",

  received1098TThisYear: "no",
  received1098TLastYear: "no",

  docsReliedOn: [],
  docsOtherText: "",

  hasSubstantiation1098TAndReceipts: "no",

  magiAdjustment: false,
  dependentOfAnotherButNotClaiming: false,
  makeAotcNotRefundable: false,
  undergradOnly: false,
};

function YesNoField<TForm extends Record<string, any>>(props: {
  label: string;
  name: keyof TForm & string;
  control: any;
}) {
  const { label, name, control } = props;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Label className="text-sm font-medium text-slate-800">{label}</Label>
      <Controller
        control={control}
        name={name as any}
        render={({ field }: { field: ControllerRenderProps<any, any> }) => (
          <RadioGroup
            className="mt-3 flex gap-6"
            value={field.value}
            onValueChange={field.onChange}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id={`${name}-yes`} />
              <Label htmlFor={`${name}-yes`}>Yes</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id={`${name}-no`} />
              <Label htmlFor={`${name}-no`}>No</Label>
            </div>
          </RadioGroup>
        )}
      />
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[#E72B69]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {hint ? <div className="mt-1 text-xs text-slate-600">{hint}</div> : null}
      </div>
    </label>
  );
}

export default function EducationCreditsAndDeductions({
  onSave,
}: {
  onSave?: (values: EducationCreditsAndDeductionsValues) => Promise<void> | void;
}) {
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  const [saveErr, setSaveErr] = React.useState<string | null>(null);

  const resolver: Resolver<EducationCreditsAndDeductionsValues> =
    zodResolver(schema) as unknown as Resolver<EducationCreditsAndDeductionsValues>;

  const form = useForm<EducationCreditsAndDeductionsValues>({
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
    formState: { errors, isSubmitting },
  } = form;

  const instIsForeign = watch("instIsForeign");
  const docsReliedOn = watch("docsReliedOn");

  // ✅ Load saved values (optional but recommended)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/education-credits", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (data?.values) {
          reset({ ...defaultValues, ...data.values });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [reset]);

  const toggleDoc = (doc: (typeof DOCS_OPTIONS)[number]) => {
    const cur = Array.isArray(docsReliedOn) ? docsReliedOn : [];
    const next = cur.includes(doc) ? cur.filter((x) => x !== doc) : [...cur, doc];
    setValue("docsReliedOn", next as any, { shouldDirty: true, shouldValidate: true });
    if (doc === "Other" && !next.includes("Other")) {
      setValue("docsOtherText", "", { shouldDirty: true });
    }
  };

  const onSubmit: SubmitHandler<EducationCreditsAndDeductionsValues> = async (values) => {
    setSaveMsg(null);
    setSaveErr(null);

    if (onSave) {
      await onSave(values);
      setSaveMsg("✅ Saved.");
      return;
    }

    const res = await fetch("/api/education-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({} as any));
      setSaveErr(err?.error || "Failed to save education credits");
      return;
    }

    setSaveMsg("✅ Saved.");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
      onChange={() => {
        // clear success message when they edit again
        if (saveMsg) setSaveMsg(null);
        if (saveErr) setSaveErr(null);
      }}
    >
      <Tabs defaultValue="page1">
        <TabsList className="grid grid-cols-2 rounded-xl bg-white p-1 ring-1 ring-slate-200">
          <TabsTrigger
            value="page1"
            className="rounded-lg data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]"
          >
            Page 1 – Student
          </TabsTrigger>
          <TabsTrigger
            value="page2"
            className="rounded-lg data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]"
          >
            Page 2 – Institution / 8867
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Page 1 ---------------- */}
        <TabsContent value="page1">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Education Credits & Deductions</CardTitle>
              <div className="mt-2 h-1 w-36 rounded-full" style={brandGradient} />
              <p className="mt-3 text-sm text-slate-600">
                Student + American Opportunity / Hope Scholarship details.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <FieldRow>
                <div>
                  <Label className="text-slate-700">Student’s First Name</Label>
                  <Input className="mt-1" {...register("studentFirstName")} />
                  {errors.studentFirstName && (
                    <p className="mt-1 text-xs text-red-600">{errors.studentFirstName.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-slate-700">Student’s Last Name</Label>
                  <Input className="mt-1" {...register("studentLastName")} />
                  {errors.studentLastName && (
                    <p className="mt-1 text-xs text-red-600">{errors.studentLastName.message}</p>
                  )}
                </div>
              </FieldRow>

              <FieldRow>
                <div>
                  <Label className="text-slate-700">Student SSN (9 digits)</Label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="#########"
                    {...register("studentSsn")}
                    onChange={(e) => {
                      const v = digitsOnly(e.target.value, 9);
                      setValue("studentSsn", v, { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                  {errors.studentSsn && (
                    <p className="mt-1 text-xs text-red-600">{errors.studentSsn.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-slate-700">State</Label>
                  <Controller
                    control={control}
                    name="studentState"
                    render={({ field }: { field: ControllerRenderProps<EducationCreditsAndDeductionsValues, "studentState"> }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s.v} value={s.v}>
                              {s.l} ({s.v})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.studentState && (
                    <p className="mt-1 text-xs text-red-600">{errors.studentState.message}</p>
                  )}
                </div>
              </FieldRow>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Yes / No Questions</p>
                <p className="mt-1 text-xs text-slate-600">
                  Answer the following for AOTC / Hope Scholarship evaluation.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <YesNoField<EducationCreditsAndDeductionsValues>
                    label='Has the Hope Scholarship Credit or American Opportunity Credit been claimed for this student a total of "four times" in any prior years?'
                    name="hopeOrAotcFourTimesPrior"
                    control={control}
                  />
                  <YesNoField<EducationCreditsAndDeductionsValues>
                    label="Was this student enrolled at least half time for at least one academic period that began this year at an eligible educational institution in a program leading toward a post-secondary degree/certificate/credential?"
                    name="enrolledHalfTimeEligibleProgram"
                    control={control}
                  />
                  <YesNoField<EducationCreditsAndDeductionsValues>
                    label="Did this student complete the first four years of post-secondary education before this year?"
                    name="completedFirstFourYearsBeforeThisYear"
                    control={control}
                  />
                  <YesNoField<EducationCreditsAndDeductionsValues>
                    label="Was this student convicted (before the end of this year) of a felony for possession or distribution of a controlled substance?"
                    name="convictedFelonyControlledSubstance"
                    control={control}
                  />
                </div>
              </div>

              <FieldRow>
                <div>
                  <Label className="text-slate-700">How many years has AOTC been claimed for this student?</Label>
                  <Controller
                    control={control}
                    name="aotcYearsClaimed"
                    render={({ field }: { field: ControllerRenderProps<EducationCreditsAndDeductionsValues, "aotcYearsClaimed"> }) => (
                      <Select value={field.value ?? "0"} onValueChange={field.onChange}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {["0", "1", "2", "3", "4"].map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Label className="text-sm font-medium text-slate-800">Is this student pursuing a degree?</Label>
                  <Controller
                    control={control}
                    name="pursuingDegree"
                    render={({ field }: { field: ControllerRenderProps<EducationCreditsAndDeductionsValues, "pursuingDegree"> }) => (
                      <RadioGroup
                        className="mt-3 flex gap-6"
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id="pursue-yes" />
                          <Label htmlFor="pursue-yes">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id="pursue-no" />
                          <Label htmlFor="pursue-no">No</Label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>
              </FieldRow>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Qualified Education Expenses</p>
                <p className="mt-1 text-xs text-slate-600">Enter amounts (optional). Use dollars and cents.</p>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-slate-700">
                      Total qualified education expenses REQUIRED to be paid directly to the educational institution
                    </Label>
                    <Input
                      className="mt-1"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...register("reqPaidToInstitutionExpenses")}
                      onChange={(e) => {
                        const v = moneyOnly(e.target.value);
                        setValue("reqPaidToInstitutionExpenses", v, { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {errors.reqPaidToInstitutionExpenses && (
                      <p className="mt-1 text-xs text-red-600">{errors.reqPaidToInstitutionExpenses.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-slate-700">
                      ADDITIONAL qualified education expenses NOT required to be paid directly to the educational institution
                    </Label>
                    <Input
                      className="mt-1"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...register("addlNotRequiredExpenses")}
                      onChange={(e) => {
                        const v = moneyOnly(e.target.value);
                        setValue("addlNotRequiredExpenses", v, { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {errors.addlNotRequiredExpenses && (
                      <p className="mt-1 text-xs text-red-600">{errors.addlNotRequiredExpenses.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-slate-700">
                      Tax-free education assistance received this year (allocable to the academic period)
                    </Label>
                    <Input
                      className="mt-1"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...register("taxFreeAssistThisYear")}
                      onChange={(e) => {
                        const v = moneyOnly(e.target.value);
                        setValue("taxFreeAssistThisYear", v, { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {errors.taxFreeAssistThisYear && (
                      <p className="mt-1 text-xs text-red-600">{errors.taxFreeAssistThisYear.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-slate-700">
                      Tax-free education assistance received AFTER the tax year (and before the return is filed) allocable to the academic period
                    </Label>
                    <Input
                      className="mt-1"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...register("taxFreeAssistAfterYearBeforeFiled")}
                      onChange={(e) => {
                        const v = moneyOnly(e.target.value);
                        setValue("taxFreeAssistAfterYearBeforeFiled", v, { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {errors.taxFreeAssistAfterYearBeforeFiled && (
                      <p className="mt-1 text-xs text-red-600">{errors.taxFreeAssistAfterYearBeforeFiled.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-slate-700">
                      Refunds of qualified education expenses paid this year (if refund received before last year’s return is filed)
                    </Label>
                    <Input
                      className="mt-1"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...register("refundsBeforePriorReturnFiled")}
                      onChange={(e) => {
                        const v = moneyOnly(e.target.value);
                        setValue("refundsBeforePriorReturnFiled", v, { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {errors.refundsBeforePriorReturnFiled && (
                      <p className="mt-1 text-xs text-red-600">{errors.refundsBeforePriorReturnFiled.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Page 2 ---------------- */}
        <TabsContent value="page2">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Educational Institution + 8867 Due Diligence</CardTitle>
              <div className="mt-2 h-1 w-36 rounded-full" style={brandGradient} />
            </CardHeader>

            <CardContent className="space-y-4">
              <FieldRow>
                <div>
                  <Label className="text-slate-700">Educational Institution EIN</Label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="#########"
                    {...register("institutionEin")}
                    onChange={(e) => {
                      const v = digitsOnly(e.target.value, 9);
                      setValue("institutionEin", v, { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                  {errors.institutionEin && (
                    <p className="mt-1 text-xs text-red-600">{errors.institutionEin.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-slate-700">Educational Institution Name</Label>
                  <Input className="mt-1" {...register("institutionName")} />
                </div>
              </FieldRow>

              <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <Label className="text-sm font-medium text-slate-800">Foreign institution?</Label>
                  <p className="mt-1 text-xs text-slate-600">Toggle on for foreign address fields.</p>
                </div>
                <Controller
                  control={control}
                  name="instIsForeign"
                  render={({ field }) => (
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              {!instIsForeign ? (
                <>
                  <FieldRow>
                    <div>
                      <Label className="text-slate-700">Street</Label>
                      <Input className="mt-1" {...register("instStreet")} />
                      {errors.instStreet && (
                        <p className="mt-1 text-xs text-red-600">{errors.instStreet.message}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-700">City</Label>
                      <Input className="mt-1" {...register("instCity")} />
                      {errors.instCity && (
                        <p className="mt-1 text-xs text-red-600">{errors.instCity.message}</p>
                      )}
                    </div>
                  </FieldRow>

                  <FieldRow>
                    <div>
                      <Label className="text-slate-700">State (U.S. only)</Label>
                      <Controller
                        control={control}
                        name="instState"
                        render={({ field }: { field: ControllerRenderProps<EducationCreditsAndDeductionsValues, "instState"> }) => (
                          <Select value={field.value ?? ""} onValueChange={field.onChange}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {US_STATES.map((s) => (
                                <SelectItem key={s.v} value={s.v}>
                                  {s.l} ({s.v})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.instState && (
                        <p className="mt-1 text-xs text-red-600">{errors.instState.message}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-slate-700">ZIP (U.S. only)</Label>
                      <Input
                        className="mt-1"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="#####"
                        {...register("instZip")}
                        onChange={(e) => {
                          const v = digitsOnly(e.target.value, 10);
                          setValue("instZip", v, { shouldDirty: true, shouldValidate: true });
                        }}
                      />
                      {errors.instZip && (
                        <p className="mt-1 text-xs text-red-600">{errors.instZip.message}</p>
                      )}
                    </div>
                  </FieldRow>
                </>
              ) : (
                <>
                  <FieldRow>
                    <div>
                      <Label className="text-slate-700">Province/State (Foreign only)</Label>
                      <Input className="mt-1" {...register("instProvince")} />
                    </div>
                    <div>
                      <Label className="text-slate-700">Country (Foreign only)</Label>
                      <Input className="mt-1" placeholder="Country" {...register("instCountry")} />
                      {errors.instCountry && (
                        <p className="mt-1 text-xs text-red-600">{errors.instCountry.message}</p>
                      )}
                    </div>
                  </FieldRow>

                  <div>
                    <Label className="text-slate-700">Postal Code (Foreign only)</Label>
                    <Input className="mt-1" {...register("instPostalCode")} />
                  </div>
                </>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Form 1098-T</p>
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <YesNoField<EducationCreditsAndDeductionsValues>
                    label="Did the student receive Form 1098-T from this institution for this year?"
                    name="received1098TThisYear"
                    control={control}
                  />
                  <YesNoField<EducationCreditsAndDeductionsValues>
                    label="Did the student receive Form 1098-T from the institution last year?"
                    name="received1098TLastYear"
                    control={control}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">8867 Due Diligence</p>
                <p className="mt-1 text-xs text-slate-600">
                  In addition to your notes, list any documents you relied on.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {DOCS_OPTIONS.map((doc) => (
                    <label
                      key={doc}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#E72B69]"
                        checked={(docsReliedOn ?? []).includes(doc)}
                        onChange={() => toggleDoc(doc)}
                      />
                      <span className="text-sm text-slate-800">{doc}</span>
                    </label>
                  ))}
                </div>

                {(docsReliedOn ?? []).includes("Other") && (
                  <div className="mt-3">
                    <Label className="text-slate-700">Other (describe)</Label>
                    <Input className="mt-1" {...register("docsOtherText")} />
                    {errors.docsOtherText && (
                      <p className="mt-1 text-xs text-red-600">{errors.docsOtherText.message}</p>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <YesNoField<EducationCreditsAndDeductionsValues>
                    label="Do you have substantiation, such as Form 1098-T and receipts, for the qualified tuition and related expenses for the claimed AOTC?"
                    name="hasSubstantiation1098TAndReceipts"
                    control={control}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Other Flags</p>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <Controller
                    control={control}
                    name="magiAdjustment"
                    render={({ field }) => (
                      <CheckboxRow
                        checked={!!field.value}
                        onChange={field.onChange}
                        label="Adjustment to modified adjusted gross income"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="dependentOfAnotherButNotClaiming"
                    render={({ field }) => (
                      <CheckboxRow
                        checked={!!field.value}
                        onChange={field.onChange}
                        label="You are a dependent of another, but that person is not claiming the exemption or education credit"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="makeAotcNotRefundable"
                    render={({ field }) => (
                      <CheckboxRow
                        checked={!!field.value}
                        onChange={field.onChange}
                        label="Make the American Opportunity Credit NOT refundable"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="undergradOnly"
                    render={({ field }) => (
                      <CheckboxRow
                        checked={!!field.value}
                        onChange={field.onChange}
                        label="The expenses entered are for undergraduate study ONLY"
                      />
                    )}
                  />
                </div>
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
              reset(defaultValues);
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

        {saveErr ? <div className="text-sm text-red-600">{saveErr}</div> : null}
        {saveMsg ? <div className="text-sm">{saveMsg}</div> : null}
      </div>
    </form>
  );
}
