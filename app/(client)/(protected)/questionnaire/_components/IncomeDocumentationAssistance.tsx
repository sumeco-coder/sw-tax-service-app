// app/(client)/questionnaire/_components/IncomeDocumentationAssistance.tsx
"use client";

import * as React from "react";
import {
  useForm,
  Controller,
  type SubmitHandler,
  type Resolver,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  ClipboardList,
  FileText,
  MapPin,
  DollarSign,
  Users,
  Car,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

const YESNO = ["yes", "no"] as const;

const RECORD_FORMS = [
  { value: "accounting_records", label: "Accounting records" },
  { value: "paid_invoices_receipts", label: "Paid invoices/receipts" },
  { value: "log_books", label: "Log books" },
  { value: "computer_records", label: "Computer records" },
  { value: "car_truck_expenses", label: "Car-truck expenses" },
  { value: "ledgers", label: "Ledgers" },
  { value: "business_bank_accounts", label: "Business bank accounts" },
  { value: "other", label: "Other" },
] as const;

const BUSINESS_DOCS = [
  { value: "business_cards", label: "Business cards" },
  { value: "business_stationery", label: "Business stationery" },
  { value: "receipt_book", label: "Receipts or receipt book (with company header)" },
  { value: "business_license", label: "Business/occupational license (if required)" },
  { value: "other_tax_returns", label: "Other tax returns (sales/excise, employment, etc.)" },
  { value: "advertisements", label: "Advertisements (newspaper, flier, Yellow Pages, etc.)" },
  { value: "other", label: "Other" },
] as const;

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-white"
        style={brandGradient}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function YesNoRow({
  label,
  name,
  control,
  help,
}: {
  label: string;
  name: any;
  control: any;
  help?: string;
}) {
  const idBase = String(name);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Label className="text-slate-800">{label}</Label>
      {help ? <p className="mt-1 text-xs text-slate-600">{help}</p> : null}

      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <RadioGroup
            className="mt-3 flex gap-6"
            value={field.value}
            onValueChange={field.onChange}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id={`${idBase}-yes`} />
              <Label htmlFor={`${idBase}-yes`}>Yes</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id={`${idBase}-no`} />
              <Label htmlFor={`${idBase}-no`}>No</Label>
            </div>
          </RadioGroup>
        )}
      />
    </div>
  );
}

function MultiCheckboxGroup({
  label,
  items,
  value,
  onChange,
  columns = 2,
}: {
  label: string;
  items: readonly { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Label className="text-slate-800">{label}</Label>

      <div className={`mt-3 grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {items.map((it) => {
          const checked = value.includes(it.value);
          return (
            <label
              key={it.value}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[#E72B69]"
                checked={checked}
                onChange={(e) => {
                  const next = e.target.checked
                    ? uniq([...value, it.value])
                    : value.filter((x) => x !== it.value);
                  onChange(next);
                }}
              />
              <span className="leading-snug">{it.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

const schema = z
  .object({
    // Gate question
    incomeSufficientToSupport: z.enum(YESNO).default("yes"),

    // Self employment toggle
    hasSelfEmploymentIncome: z.boolean().default(false),

    // (1) Basic business details
    businessOwnedHowLong: z.string().trim().default(""),
    businessDescription: z.string().trim().default(""),
    businessLocation: z.string().trim().default(""),

    // (2) Services & pricing
    servicesPerformed: z.string().trim().default(""),
    chargesForServices: z.string().trim().default(""),

    // (3) Clients & frequency
    approxClientsCount: z.string().trim().default(""),
    frequencyPerClient: z.string().trim().default(""),

    // (4) Items needed & replenished
    itemsNeededToOperate: z.string().trim().default(""),
    replenishedHowOften: z.string().trim().default(""),

    // (5) Travel
    travelsForBusiness: z.enum(YESNO).default("no"),
    mileageTrackingMethod: z.string().trim().default(""),
    travelWhenWhere: z.string().trim().default(""),

    // (6) Documentation to substantiate business (multi)
    businessDocs: z.array(z.string()).default([]),
    businessDocsOtherText: z.string().trim().default(""),

    // (7) Records owner
    whoMaintainsRecords: z.string().trim().default(""),

    // (8) Separate banking
    separateBankAccounts: z.enum(YESNO).default("no"),
    recordsProvidedInWhatForm: z.string().trim().default(""),
    howDifferentiatePersonalVsBusiness: z.string().trim().default(""),

    // (9) Satisfactory records
    satisfactoryRecords: z.enum(YESNO).default("yes"),
    recordsForms: z.array(z.string()).default([]),
    recordsFormsOtherText: z.string().trim().default(""),
    ifNoHowDetermineIncome: z.string().trim().default(""),
    ifNoHowDetermineExpense: z.string().trim().default(""),

    // (10) 1099-NEC
    has1099Nec: z.enum(YESNO).default("no"),
    ifNoReasonableNo1099Nec: z.enum(YESNO).default("yes"),

    // (11-13) Reasonableness checks
    expensesConsistent: z.enum(YESNO).default("yes"),
    expensesReasonable: z.enum(YESNO).default("yes"),
    typicalExpensesMissing: z.enum(YESNO).default("no"),

    // (14-16) Narrative
    whyLowExpenses: z.string().trim().default(""),
    whyHighExpensesOrLoss: z.string().trim().default(""),
    howPayAndKeepOpen: z.string().trim().default(""),

    // (17) Other info
    otherBusinessInfo: z.string().trim().default(""),
  })
  .superRefine((d, ctx) => {
    if (!d.hasSelfEmploymentIncome) return;

    // Travel follow-ups
    if (d.travelsForBusiness === "yes") {
      if (!d.mileageTrackingMethod.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["mileageTrackingMethod"],
          message: "Please explain how mileage is tracked",
        });
      }
      if (!d.travelWhenWhere.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["travelWhenWhere"],
          message: "Please describe when/where business travel occurs",
        });
      }
    }

    // Business docs "other" text if selected
    if (d.businessDocs.includes("other") && !d.businessDocsOtherText.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["businessDocsOtherText"],
        message: "Please list other documentation you can provide",
      });
    }

    // Records forms "other" text if selected
    if (d.recordsForms.includes("other") && !d.recordsFormsOtherText.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["recordsFormsOtherText"],
        message: "Please list other forms of records",
      });
    }

    // Separate banking follow-up
    if (d.separateBankAccounts === "yes" && !d.recordsProvidedInWhatForm.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["recordsProvidedInWhatForm"],
        message: "Please describe the form the records were provided in",
      });
    }
    if (d.separateBankAccounts === "no" && !d.howDifferentiatePersonalVsBusiness.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["howDifferentiatePersonalVsBusiness"],
        message: "Please explain how you separate personal vs business transactions",
      });
    }

    // If no satisfactory records, require explanations
    if (d.satisfactoryRecords === "no") {
      if (!d.ifNoHowDetermineIncome.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["ifNoHowDetermineIncome"],
          message: "Please explain how income was determined",
        });
      }
      if (!d.ifNoHowDetermineExpense.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["ifNoHowDetermineExpense"],
          message: "Please explain how expenses were determined",
        });
      }
    }

    // 1099-NEC follow-up
    if (d.has1099Nec === "no" && !d.ifNoReasonableNo1099Nec) {
      // enum has default, but keep future-proof
    }

    // Narrative prompts
    // Only validate if they typed something? We’ll leave optional to avoid blocking.
  });

export type IncomeDocumentationAssistanceValues = z.infer<typeof schema>;

const defaultValues: IncomeDocumentationAssistanceValues = {
  incomeSufficientToSupport: "yes",
  hasSelfEmploymentIncome: false,

  businessOwnedHowLong: "",
  businessDescription: "",
  businessLocation: "",

  servicesPerformed: "",
  chargesForServices: "",

  approxClientsCount: "",
  frequencyPerClient: "",

  itemsNeededToOperate: "",
  replenishedHowOften: "",

  travelsForBusiness: "no",
  mileageTrackingMethod: "",
  travelWhenWhere: "",

  businessDocs: [],
  businessDocsOtherText: "",

  whoMaintainsRecords: "",

  separateBankAccounts: "no",
  recordsProvidedInWhatForm: "",
  howDifferentiatePersonalVsBusiness: "",

  satisfactoryRecords: "yes",
  recordsForms: [],
  recordsFormsOtherText: "",
  ifNoHowDetermineIncome: "",
  ifNoHowDetermineExpense: "",

  has1099Nec: "no",
  ifNoReasonableNo1099Nec: "yes",

  expensesConsistent: "yes",
  expensesReasonable: "yes",
  typicalExpensesMissing: "no",

  whyLowExpenses: "",
  whyHighExpensesOrLoss: "",
  howPayAndKeepOpen: "",

  otherBusinessInfo: "",
};

export default function IncomeDocumentationAssistance({
  initialValues,
  onSave,
  onBack,
  saveLabel = "Save",
}: {
  initialValues?: Partial<IncomeDocumentationAssistanceValues>;
  onSave?: (values: IncomeDocumentationAssistanceValues) => Promise<void> | void;
  onBack?: () => void;
  saveLabel?: string;
}) {
  const [msg, setMsg] = React.useState("");

  // ✅ cast avoids resolver optional/required mismatch TS error
  const resolver: Resolver<IncomeDocumentationAssistanceValues> =
    zodResolver(schema) as unknown as Resolver<IncomeDocumentationAssistanceValues>;

  const form = useForm<IncomeDocumentationAssistanceValues>({
    resolver,
    defaultValues: { ...defaultValues, ...(initialValues ?? {}) },
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

  const hasSE = watch("hasSelfEmploymentIncome");
  const travels = watch("travelsForBusiness");
  const separateBank = watch("separateBankAccounts");
  const satisfactory = watch("satisfactoryRecords");
  const businessDocs = watch("businessDocs");
  const recordsForms = watch("recordsForms");

  const submit: SubmitHandler<IncomeDocumentationAssistanceValues> = async (values) => {
    setMsg("");

    if (onSave) {
      await onSave(values);
      setMsg("Saved.");
      return;
    }

    const res = await fetch("/api/income-documentation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save income documentation assistance");
    }

    setMsg("Saved.");
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-slate-900">Income Documentation Assistance</CardTitle>
        <div className="mt-2 h-1 w-28 rounded-full" style={brandGradient} />
        <p className="mt-3 text-sm text-slate-600">
          Answer a few questions that help document income and self-employment support.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {msg && <p className="text-sm text-slate-600">{msg}</p>}

        <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
          {/* Gate */}
          <YesNoRow
            label="Is your income sufficient to support you and qualifying children?"
            name="incomeSufficientToSupport"
            control={control}
          />

          {/* Toggle: self-employment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-slate-800">Taxpayer with self-employment income</Label>
                <p className="mt-1 text-xs text-slate-600">
                  Turn on to complete business questions.
                </p>
              </div>

              <Controller
                control={control}
                name="hasSelfEmploymentIncome"
                render={({ field }) => (
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={(v) => {
                      field.onChange(v);
                      if (!v) {
                        // optional scrub to keep form clean when turning off
                        reset({
                          ...watch(),
                          hasSelfEmploymentIncome: false,
                          businessOwnedHowLong: "",
                          businessDescription: "",
                          businessLocation: "",
                          servicesPerformed: "",
                          chargesForServices: "",
                          approxClientsCount: "",
                          frequencyPerClient: "",
                          itemsNeededToOperate: "",
                          replenishedHowOften: "",
                          travelsForBusiness: "no",
                          mileageTrackingMethod: "",
                          travelWhenWhere: "",
                          businessDocs: [],
                          businessDocsOtherText: "",
                          whoMaintainsRecords: "",
                          separateBankAccounts: "no",
                          recordsProvidedInWhatForm: "",
                          howDifferentiatePersonalVsBusiness: "",
                          satisfactoryRecords: "yes",
                          recordsForms: [],
                          recordsFormsOtherText: "",
                          ifNoHowDetermineIncome: "",
                          ifNoHowDetermineExpense: "",
                          has1099Nec: "no",
                          ifNoReasonableNo1099Nec: "yes",
                          expensesConsistent: "yes",
                          expensesReasonable: "yes",
                          typicalExpensesMissing: "no",
                          whyLowExpenses: "",
                          whyHighExpensesOrLoss: "",
                          howPayAndKeepOpen: "",
                          otherBusinessInfo: "",
                        });
                      }
                    }}
                  />
                )}
              />
            </div>
          </div>

          {/* Self-employment section */}
          {hasSE && (
            <div className="space-y-5">
              {/* 1 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle
                  icon={<Briefcase className="h-4 w-4" />}
                  title="1) Business basics"
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-slate-700">How long have you owned your business?</Label>
                    <Input className="mt-1" placeholder="e.g., 3 years" {...register("businessOwnedHowLong")} />
                  </div>
                  <div>
                    <Label className="text-slate-700">Where do you conduct business?</Label>
                    <div className="relative mt-1">
                      <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input className="pl-9" placeholder="Home, office, online, client site..." {...register("businessLocation")} />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-slate-700">Brief description of business</Label>
                    <Textarea className="mt-1" rows={3} placeholder="What you do / business type" {...register("businessDescription")} />
                  </div>
                </div>
              </div>

              {/* 2 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle
                  icon={<ClipboardList className="h-4 w-4" />}
                  title="2) Services & pricing"
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-slate-700">What services do you perform?</Label>
                    <Textarea className="mt-1" rows={3} {...register("servicesPerformed")} />
                  </div>
                  <div>
                    <Label className="text-slate-700">How much do you charge for them?</Label>
                    <div className="relative mt-1">
                      <DollarSign className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input className="pl-9" placeholder="e.g., $100 per job / hourly rate" {...register("chargesForServices")} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle icon={<Users className="h-4 w-4" />} title="3) Clients & frequency" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-slate-700">Approximately how many clients do you have?</Label>
                    <Input className="mt-1" placeholder="e.g., 10" {...register("approxClientsCount")} />
                  </div>
                  <div>
                    <Label className="text-slate-700">How often do you provide services for each client?</Label>
                    <Input className="mt-1" placeholder="Weekly, monthly, on-demand..." {...register("frequencyPerClient")} />
                  </div>
                </div>
              </div>

              {/* 4 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle icon={<FileText className="h-4 w-4" />} title="4) Items needed to operate" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-slate-700">What types of items do you need to operate?</Label>
                    <Textarea className="mt-1" rows={3} {...register("itemsNeededToOperate")} />
                  </div>
                  <div>
                    <Label className="text-slate-700">How often are they replenished?</Label>
                    <Input className="mt-1" placeholder="Weekly / monthly / as needed" {...register("replenishedHowOften")} />
                  </div>
                </div>
              </div>

              {/* 5 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle icon={<Car className="h-4 w-4" />} title="5) Travel for business" />
                <YesNoRow
                  label="Do you travel for business?"
                  name="travelsForBusiness"
                  control={control}
                />

                {travels === "yes" && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-slate-700">How do you keep track of mileage?</Label>
                      <Input className="mt-1" placeholder="App, log book, calendar..." {...register("mileageTrackingMethod")} />
                      {errors.mileageTrackingMethod && (
                        <p className="mt-1 text-xs text-red-600">{errors.mileageTrackingMethod.message}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-700">When and where do you travel for business?</Label>
                      <Input className="mt-1" placeholder="Client sites, deliveries, meetings..." {...register("travelWhenWhere")} />
                      {errors.travelWhenWhere && (
                        <p className="mt-1 text-xs text-red-600">{errors.travelWhenWhere.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 6 */}
              <MultiCheckboxGroup
                label="6) Can you provide any documentation to substantiate your business? (check all that apply)"
                items={BUSINESS_DOCS as any}
                value={businessDocs ?? []}
                onChange={(next) => setValue("businessDocs", next as any, { shouldDirty: true, shouldValidate: true })}
              />
              {businessDocs?.includes("other") && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <Label className="text-slate-700">Other documentation (list)</Label>
                  <Textarea className="mt-1" rows={3} {...register("businessDocsOtherText")} />
                  {errors.businessDocsOtherText && (
                    <p className="mt-1 text-xs text-red-600">{errors.businessDocsOtherText.message}</p>
                  )}
                </div>
              )}

              {/* 7 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Label className="text-slate-700">7) Who maintains the business records?</Label>
                <Input className="mt-1" placeholder="Taxpayer, bookkeeper, spouse..." {...register("whoMaintainsRecords")} />
              </div>

              {/* 8 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle title="8) Banking separation" icon={<Briefcase className="h-4 w-4" />} />
                <YesNoRow
                  label="Do you maintain separate banking accounts for personal and business transactions?"
                  name="separateBankAccounts"
                  control={control}
                />

                {separateBank === "yes" ? (
                  <div>
                    <Label className="text-slate-700">If yes: in what form were the records provided?</Label>
                    <Input className="mt-1" placeholder="Statements, exports, QuickBooks..." {...register("recordsProvidedInWhatForm")} />
                    {errors.recordsProvidedInWhatForm && (
                      <p className="mt-1 text-xs text-red-600">{errors.recordsProvidedInWhatForm.message}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label className="text-slate-700">
                      If no: how do you differentiate between personal vs business transactions and monetary assets?
                    </Label>
                    <Textarea className="mt-1" rows={3} {...register("howDifferentiatePersonalVsBusiness")} />
                    {errors.howDifferentiatePersonalVsBusiness && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.howDifferentiatePersonalVsBusiness.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 9 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle title="9) Records quality" icon={<FileText className="h-4 w-4" />} />
                <YesNoRow
                  label="Do you have satisfactory records of income and expense?"
                  name="satisfactoryRecords"
                  control={control}
                />

                {satisfactory === "yes" ? (
                  <>
                    <MultiCheckboxGroup
                      label='If "Yes," in what form are these records? (check all that apply)'
                      items={RECORD_FORMS as any}
                      value={recordsForms ?? []}
                      onChange={(next) =>
                        setValue("recordsForms", next as any, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                    {recordsForms?.includes("other") && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <Label className="text-slate-700">Other records (list)</Label>
                        <Textarea className="mt-1" rows={3} {...register("recordsFormsOtherText")} />
                        {errors.recordsFormsOtherText && (
                          <p className="mt-1 text-xs text-red-600">{errors.recordsFormsOtherText.message}</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-slate-700">If no: how did you determine the amount of income?</Label>
                      <Textarea className="mt-1" rows={3} {...register("ifNoHowDetermineIncome")} />
                      {errors.ifNoHowDetermineIncome && (
                        <p className="mt-1 text-xs text-red-600">{errors.ifNoHowDetermineIncome.message}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-slate-700">If no: how did you determine the amount of expense?</Label>
                      <Textarea className="mt-1" rows={3} {...register("ifNoHowDetermineExpense")} />
                      {errors.ifNoHowDetermineExpense && (
                        <p className="mt-1 text-xs text-red-600">{errors.ifNoHowDetermineExpense.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 10 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle title="10) Form 1099-NEC" icon={<ClipboardList className="h-4 w-4" />} />
                <YesNoRow label="Do you have any Forms 1099-NEC to support your income?" name="has1099Nec" control={control} />
                <YesNoRow
                  label='If "No," is it reasonable that your business type would not receive Form 1099-NEC?'
                  name="ifNoReasonableNo1099Nec"
                  control={control}
                />
              </div>

              {/* 11-13 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle title="11–13) Expense reasonableness" icon={<DollarSign className="h-4 w-4" />} />
                <YesNoRow label="Are your expenses consistent with the type of business?" name="expensesConsistent" control={control} />
                <YesNoRow label="Do you feel the amounts of expenses are reasonable?" name="expensesReasonable" control={control} />
                <YesNoRow label="Are any typical expenses for this type of business missing?" name="typicalExpensesMissing" control={control} />
              </div>

              {/* 14-16 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <SectionTitle title="14–16) Explain unusual expense patterns" icon={<FileText className="h-4 w-4" />} />

                <div>
                  <Label className="text-slate-700">14) If no expenses or low expenses, why are expenses so low?</Label>
                  <Textarea className="mt-1" rows={3} {...register("whyLowExpenses")} />
                </div>

                <div>
                  <Label className="text-slate-700">15) If high expenses or overall loss, why are expenses so high?</Label>
                  <Textarea className="mt-1" rows={3} {...register("whyHighExpensesOrLoss")} />
                </div>

                <div>
                  <Label className="text-slate-700">
                    16) If high expenses or loss, how are you able to pay these expenses and keep this business open?
                  </Label>
                  <Textarea className="mt-1" rows={3} {...register("howPayAndKeepOpen")} />
                </div>
              </div>

              {/* 17 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Label className="text-slate-700">17) List any other information you can provide related to your business</Label>
                <Textarea className="mt-1" rows={4} {...register("otherBusinessInfo")} />
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                Back
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => reset(defaultValues)}
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
              {isSubmitting ? "Saving…" : saveLabel}
            </Button>
          </div>

          <p className="text-xs text-slate-500">
            Note: Provide the best info you have. If you’re missing documents, describe how you tracked income/expenses.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
