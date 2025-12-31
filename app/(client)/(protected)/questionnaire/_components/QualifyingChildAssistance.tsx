// app/(client)/questionnaire/_components/QualiifyingChildAssistance.tsx
"use client";

import * as React from "react";
import {
  useForm,
  Controller,
  type SubmitHandler,
  type Resolver,
  useFieldArray,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, UserRound } from "lucide-react";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

function digitsOnly(v: unknown, maxLen: number) {
  return String(v ?? "").replace(/\D/g, "").slice(0, maxLen);
}

const YESNO = ["yes", "no"] as const;

const STUDENT_STATUS = ["not_student", "student"] as const;
const DISABILITY_STATUS = ["not_disabled", "disabled"] as const;

const BIO_PARENT_WHICH = ["mother", "father"] as const;

const ADOPTION_STATUS = ["pending", "final"] as const;

const RESIDENCY_DOCS = [
  "school_records",
  "medical_records",
  "letter",
  "social_service_records",
  "daycare_records",
] as const;

const RESIDENCY_DOC_LABEL: Record<(typeof RESIDENCY_DOCS)[number], string> = {
  school_records: "School records",
  medical_records: "Medical records",
  letter: "Letter",
  social_service_records: "Social service records",
  daycare_records: "Daycare records",
};

type ResidencyDoc = (typeof RESIDENCY_DOCS)[number];

function toggleEnumInArray<T extends string>(arr: T[], value: T) {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

const childSchema = z
  .object({
    // Basic
    ssn: z
      .string()
      .default("")
      .transform((v) => digitsOnly(v, 9))
      .refine((v) => v === "" || v.length === 9, { message: "SSN must be 9 digits" }),
    firstName: z.string().trim().min(1, "Required"),
    lastName: z.string().trim().min(1, "Required"),

    // Over 18 section toggle
    overAge18: z.boolean().default(false),

    // Student details (only if overAge18 === true)
    studentStatus: z.enum(STUDENT_STATUS).default("not_student"),
    studentSchoolName: z.string().trim().default(""),
    studentHasFullTimeDocs5Months: z.enum(YESNO).default("no"),

    // Disability details (only if overAge18 === true)
    disabilityStatus: z.enum(DISABILITY_STATUS).default("not_disabled"),
    disabilityType: z.string().trim().default(""),
    receivesSsiOrDisabilityPayments: z.enum(YESNO).default("no"),
    hasProviderLetterDisabled: z.enum(YESNO).default("no"),

    // Relationship-other-than-son-daughter toggle
    relationshipOtherThanSonDaughter: z.boolean().default(false),

    // Bio parents not living with child (only when relationshipOtherThanSonDaughter)
    bioParentsNotLivingWithChild: z.array(z.enum(BIO_PARENT_WHICH)).default([]),
    bioParentProvidesFinancialSupport: z.enum(YESNO).default("no"),

    // Adoption
    adoptionApplies: z.boolean().default(false),
    adoptionStatus: z.enum(ADOPTION_STATUS).default("pending"),
    adoptionHasAgencyLetterIfPending: z.enum(YESNO).default("no"),

    // Foster
    fosterApplies: z.boolean().default(false),
    fosterHasPlacementLetterOrCourtDoc: z.enum(YESNO).default("no"),

    // Relative relationship docs
    relativeApplies: z.boolean().default(false),
    relativeHasBirthCertificateProof: z.enum(YESNO).default("no"),

    // Step relationship docs
    stepApplies: z.boolean().default(false),
    stepHasBirthAndMarriageCertificateProof: z.enum(YESNO).default("no"),

    // Residency proof (multi-select)
    residencyProofDocs: z.array(z.enum(RESIDENCY_DOCS)).default([]),
    daycareProvider: z.string().trim().default(""),

    // Not parent / AGI question
    taxpayerIsParent: z.enum(YESNO).default("yes"),
    agiHigherThanAnyParent: z.enum(YESNO).default("no"),
  })
  .superRefine((c, ctx) => {
    // Require SSN or allow blank? You asked for “Qualifying Child SSN” so make it required.
    if (!c.ssn || c.ssn.length !== 9) {
      ctx.addIssue({
        code: "custom",
        path: ["ssn"],
        message: "Enter 9-digit SSN",
      });
    }

    if (c.overAge18) {
      if (c.studentStatus === "student" && !c.studentSchoolName.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["studentSchoolName"],
          message: "Enter the school name",
        });
      }

      if (c.disabilityStatus === "disabled" && !c.disabilityType.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["disabilityType"],
          message: "Enter the disability type",
        });
      }
    }

    if (c.residencyProofDocs.includes("daycare_records") && !c.daycareProvider.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["daycareProvider"],
        message: "Enter daycare provider name",
      });
    }

    // If taxpayer is NOT parent, show AGI question (we still validate only when not parent)
    if (c.taxpayerIsParent === "no" && !c.agiHigherThanAnyParent) {
      // enum already set; no additional validation needed
    }
  });

const schema = z.object({
  children: z.array(childSchema).min(1, "Add at least one child"),
});

export type QualifyingChildAssistanceValues = z.infer<typeof schema>;

const defaultChild = () =>
  ({
    ssn: "",
    firstName: "",
    lastName: "",

    overAge18: false,
    studentStatus: "not_student",
    studentSchoolName: "",
    studentHasFullTimeDocs5Months: "no",

    disabilityStatus: "not_disabled",
    disabilityType: "",
    receivesSsiOrDisabilityPayments: "no",
    hasProviderLetterDisabled: "no",

    relationshipOtherThanSonDaughter: false,
    bioParentsNotLivingWithChild: [],
    bioParentProvidesFinancialSupport: "no",

    adoptionApplies: false,
    adoptionStatus: "pending",
    adoptionHasAgencyLetterIfPending: "no",

    fosterApplies: false,
    fosterHasPlacementLetterOrCourtDoc: "no",

    relativeApplies: false,
    relativeHasBirthCertificateProof: "no",

    stepApplies: false,
    stepHasBirthAndMarriageCertificateProof: "no",

    residencyProofDocs: [],
    daycareProvider: "",

    taxpayerIsParent: "yes",
    agiHigherThanAnyParent: "no",
  }) satisfies QualifyingChildAssistanceValues["children"][number];

const defaultValues: QualifyingChildAssistanceValues = {
  children: [defaultChild()],
};

function YesNoField({
  label,
  value,
  onChange,
  namePrefixId,
}: {
  label: string;
  value: "yes" | "no";
  onChange: (v: "yes" | "no") => void;
  namePrefixId: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Label className="text-sm font-medium text-slate-800">{label}</Label>
      <RadioGroup
        className="mt-2 flex gap-6"
        value={value}
        onValueChange={(v) => onChange(v as "yes" | "no")}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id={`${namePrefixId}-yes`} />
          <Label htmlFor={`${namePrefixId}-yes`}>Yes</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id={`${namePrefixId}-no`} />
          <Label htmlFor={`${namePrefixId}-no`}>No</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

export default function QualifyingChildAssistance({
  initialValues,
  onSave,
  onBack,
  saveLabel = "Save",
}: {
  initialValues?: Partial<QualifyingChildAssistanceValues>;
  onSave?: (values: QualifyingChildAssistanceValues) => Promise<void> | void;
  onBack?: () => void;
  saveLabel?: string;
}) {
  // ✅ typed resolver cast to avoid TS “optional vs required” mismatch like you hit before
  const resolver: Resolver<QualifyingChildAssistanceValues> =
    zodResolver(schema) as unknown as Resolver<QualifyingChildAssistanceValues>;

  const form = useForm<QualifyingChildAssistanceValues>({
    resolver,
    defaultValues: { ...defaultValues, ...(initialValues ?? {}) },
    mode: "onBlur",
  });

  const {
    control,
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "children",
  });

  const childrenWatch = watch("children");

  const submit: SubmitHandler<QualifyingChildAssistanceValues> = async (values) => {
    if (onSave) return onSave(values);

    const res = await fetch("/api/qualifying-children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save qualifying child info");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-slate-900">Qualifying Child Assistance</CardTitle>
              <div className="mt-2 h-1 w-28 rounded-full" style={brandGradient} />
              <p className="mt-3 text-sm text-slate-600">
                Add one or more qualifying children and answer documentation questions.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => append(defaultChild())}
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {errors.children?.message && (
            <p className="text-sm text-red-600">{errors.children.message as string}</p>
          )}

          <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
            {fields.map((f, idx) => {
              const c = childrenWatch?.[idx];
              const over18 = Boolean(c?.overAge18);
              const relOther = Boolean(c?.relationshipOtherThanSonDaughter);
              const taxpayerIsParent = c?.taxpayerIsParent ?? "yes";
              const docs = (c?.residencyProofDocs ?? []) as ResidencyDoc[];

              return (
                <div key={f.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                        style={brandGradient}
                      >
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Child {idx + 1}
                        </p>
                        <p className="text-xs text-slate-600">
                          Enter identity + documentation answers
                        </p>
                      </div>
                    </div>

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        onClick={() => remove(idx)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Basic */}
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Label className="text-slate-700">Qualifying Child SSN</Label>
                      <Input
                        className="mt-1"
                        inputMode="numeric"
                        maxLength={9}
                        placeholder="9 digits"
                        {...register(`children.${idx}.ssn` as const)}
                        onChange={(e) =>
                          setValue(`children.${idx}.ssn`, digitsOnly(e.target.value, 9), {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      />
                      {errors.children?.[idx]?.ssn && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.children[idx]!.ssn!.message as string}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-slate-700">Qualifying Child First Name</Label>
                      <Input className="mt-1" {...register(`children.${idx}.firstName` as const)} />
                      {errors.children?.[idx]?.firstName && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.children[idx]!.firstName!.message as string}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-slate-700">Qualifying Child Last Name</Label>
                      <Input className="mt-1" {...register(`children.${idx}.lastName` as const)} />
                      {errors.children?.[idx]?.lastName && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.children[idx]!.lastName!.message as string}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Over 18 toggle */}
                  <div className="mt-4 flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-800">
                        Complete Over-18 Section
                      </Label>
                      <p className="mt-1 text-xs text-slate-600">
                        Turn on only if the qualifying child is over age 18.
                      </p>
                    </div>

                    <Controller
                      control={control}
                      name={`children.${idx}.overAge18` as const}
                      render={({ field }) => (
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>

                  {/* Over 18 section */}
                  {over18 && (
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      {/* Students */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Children who are students
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label className="text-slate-700">Student Status</Label>
                            <Controller
                              control={control}
                              name={`children.${idx}.studentStatus` as const}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_student">Not a Student</SelectItem>
                                    <SelectItem value="student">Student</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          <div>
                            <Label className="text-slate-700">School (if student)</Label>
                            <Input
                              className="mt-1"
                              disabled={(c?.studentStatus ?? "not_student") !== "student"}
                              placeholder="School name"
                              {...register(`children.${idx}.studentSchoolName` as const)}
                            />
                            {errors.children?.[idx]?.studentSchoolName && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.children[idx]!.studentSchoolName!.message as string}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <Controller
                            control={control}
                            name={`children.${idx}.studentHasFullTimeDocs5Months` as const}
                            render={({ field }) => (
                              <YesNoField
                                label="Can you provide documentation showing the child was a full-time student for at least 5 months?"
                                value={field.value}
                                onChange={field.onChange}
                                namePrefixId={`child-${idx}-student-docs`}
                              />
                            )}
                          />
                        </div>
                      </div>

                      {/* Disability */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Children with a permanent and total disability
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label className="text-slate-700">Disability Status</Label>
                            <Controller
                              control={control}
                              name={`children.${idx}.disabilityStatus` as const}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_disabled">Not Disabled</SelectItem>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          <div>
                            <Label className="text-slate-700">Type of disability (if disabled)</Label>
                            <Input
                              className="mt-1"
                              disabled={(c?.disabilityStatus ?? "not_disabled") !== "disabled"}
                              placeholder="Describe"
                              {...register(`children.${idx}.disabilityType` as const)}
                            />
                            {errors.children?.[idx]?.disabilityType && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.children[idx]!.disabilityType!.message as string}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Controller
                            control={control}
                            name={`children.${idx}.receivesSsiOrDisabilityPayments` as const}
                            render={({ field }) => (
                              <YesNoField
                                label="Does the child receive SSI or other disability payments?"
                                value={field.value}
                                onChange={field.onChange}
                                namePrefixId={`child-${idx}-ssi`}
                              />
                            )}
                          />

                          <Controller
                            control={control}
                            name={`children.${idx}.hasProviderLetterDisabled` as const}
                            render={({ field }) => (
                              <YesNoField
                                label="Do you have a letter verifying permanent and total disability?"
                                value={field.value}
                                onChange={field.onChange}
                                namePrefixId={`child-${idx}-disabled-letter`}
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Relationship other than son/daughter toggle */}
                  <div className="mt-4 flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-800">
                        Relationship is other than son or daughter
                      </Label>
                      <p className="mt-1 text-xs text-slate-600">
                        Turn on to complete the relationship documentation section.
                      </p>
                    </div>

                    <Controller
                      control={control}
                      name={`children.${idx}.relationshipOtherThanSonDaughter` as const}
                      render={({ field }) => (
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>

                  {/* Relationship section */}
                  {relOther && (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          If biological parents are NOT living with the child, where is the parent?
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3">
                          {BIO_PARENT_WHICH.map((opt) => {
                            const checked = (c?.bioParentsNotLivingWithChild ?? []).includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                  checked
                                    ? "border-[#E72B69] bg-[#E72B69]/10 text-slate-900"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                                onClick={() => {
                                  const current = (c?.bioParentsNotLivingWithChild ??
                                    []) as ("mother" | "father")[];
                                  const next = toggleEnumInArray(current, opt);
                                  setValue(`children.${idx}.bioParentsNotLivingWithChild`, next, {
                                    shouldDirty: true,
                                  });
                                }}
                              >
                                {opt === "mother" ? "Mother" : "Father"}
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-4">
                          <Controller
                            control={control}
                            name={`children.${idx}.bioParentProvidesFinancialSupport` as const}
                            render={({ field }) => (
                              <YesNoField
                                label="Does the biological parent provide any financial support?"
                                value={field.value}
                                onChange={field.onChange}
                                namePrefixId={`child-${idx}-bio-support`}
                              />
                            )}
                          />
                        </div>
                      </div>

                      {/* Adoption */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">Adopted children</p>
                          <Controller
                            control={control}
                            name={`children.${idx}.adoptionApplies` as const}
                            render={({ field }) => (
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                        </div>

                        {c?.adoptionApplies && (
                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <Label className="text-slate-700">Is the adoption final or pending?</Label>
                              <Controller
                                control={control}
                                name={`children.${idx}.adoptionStatus` as const}
                                render={({ field }) => (
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="final">Final</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>

                            <div>
                              <Controller
                                control={control}
                                name={`children.${idx}.adoptionHasAgencyLetterIfPending` as const}
                                render={({ field }) => (
                                  <YesNoField
                                    label="If pending: do you have a letter from the authorized adoption agency?"
                                    value={field.value}
                                    onChange={field.onChange}
                                    namePrefixId={`child-${idx}-adoption-letter`}
                                  />
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Foster */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">Foster children</p>
                          <Controller
                            control={control}
                            name={`children.${idx}.fosterApplies` as const}
                            render={({ field }) => (
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                        </div>

                        {c?.fosterApplies && (
                          <div className="mt-4">
                            <Controller
                              control={control}
                              name={`children.${idx}.fosterHasPlacementLetterOrCourtDoc` as const}
                              render={({ field }) => (
                                <YesNoField
                                  label="Do you have a letter from the authorized placement agency or applicable court document?"
                                  value={field.value}
                                  onChange={field.onChange}
                                  namePrefixId={`child-${idx}-foster-letter`}
                                />
                              )}
                            />
                          </div>
                        )}
                      </div>

                      {/* Relative */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">
                            Brother/sister/niece/nephew/grandchildren (etc.)
                          </p>
                          <Controller
                            control={control}
                            name={`children.${idx}.relativeApplies` as const}
                            render={({ field }) => (
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                        </div>

                        {c?.relativeApplies && (
                          <div className="mt-4">
                            <Controller
                              control={control}
                              name={`children.${idx}.relativeHasBirthCertificateProof` as const}
                              render={({ field }) => (
                                <YesNoField
                                  label="Can you provide a birth certificate verifying your relationship to the child?"
                                  value={field.value}
                                  onChange={field.onChange}
                                  namePrefixId={`child-${idx}-relative-bc`}
                                />
                              )}
                            />
                          </div>
                        )}
                      </div>

                      {/* Step */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">Stepchildren (and descendants)</p>
                          <Controller
                            control={control}
                            name={`children.${idx}.stepApplies` as const}
                            render={({ field }) => (
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                        </div>

                        {c?.stepApplies && (
                          <div className="mt-4">
                            <Controller
                              control={control}
                              name={`children.${idx}.stepHasBirthAndMarriageCertificateProof` as const}
                              render={({ field }) => (
                                <YesNoField
                                  label="Can you provide a birth certificate & marriage certificate verifying your relationship?"
                                  value={field.value}
                                  onChange={field.onChange}
                                  namePrefixId={`child-${idx}-step-proof`}
                                />
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Residency proof docs */}
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Documentation to prove child lived with you more than half the year
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {RESIDENCY_DOCS.map((opt) => {
                        const checked = docs.includes(opt);
                        return (
                          <label
                            key={opt}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#E72B69]"
                              checked={checked}
                              onChange={() => {
                                const next = toggleEnumInArray(docs, opt);
                                setValue(`children.${idx}.residencyProofDocs`, next, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                                if (!next.includes("daycare_records")) {
                                  setValue(`children.${idx}.daycareProvider`, "", { shouldDirty: true });
                                }
                              }}
                            />
                            {RESIDENCY_DOC_LABEL[opt]}
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <Label className="text-slate-700">Daycare provider (only if daycare records selected)</Label>
                      <Input
                        className="mt-1"
                        disabled={!docs.includes("daycare_records")}
                        placeholder="Provider name"
                        {...register(`children.${idx}.daycareProvider` as const)}
                      />
                      {errors.children?.[idx]?.daycareProvider && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.children[idx]!.daycareProvider!.message as string}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Parent/AGI */}
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <Controller
                      control={control}
                      name={`children.${idx}.taxpayerIsParent` as const}
                      render={({ field }) => (
                        <YesNoField
                          label="Are you the parent of the qualifying child?"
                          value={field.value}
                          onChange={field.onChange}
                          namePrefixId={`child-${idx}-is-parent`}
                        />
                      )}
                    />

                    {taxpayerIsParent === "no" && (
                      <div className="mt-4">
                        <Controller
                          control={control}
                          name={`children.${idx}.agiHigherThanAnyParent` as const}
                          render={({ field }) => (
                            <YesNoField
                              label="If you are not a parent: is your AGI higher than any parent of the child?"
                              value={field.value}
                              onChange={field.onChange}
                              namePrefixId={`child-${idx}-agi`}
                            />
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => append(defaultChild())}
                disabled={isSubmitting}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Child
              </Button>

              <div className="flex items-center gap-2">
                {onBack && (
                  <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                    Back
                  </Button>
                )}

                <Button type="submit" className="text-white hover:opacity-90" style={brandGradient} disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : saveLabel}
                </Button>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Add Child 2 / Child 3 using “Add Child”. Each child is saved as part of this form submission.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
