// app/(client)/questionnaire/_components/IdentificationForTaxpayerAndSpouse.tsx
"use client";

import * as React from "react";
import { useForm, Controller, type Resolver, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, ShieldCheck } from "lucide-react";

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

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

const focusRing =
  "focus:outline-none focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]/40";

const inputBase =
  `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ` +
  `placeholder:text-slate-400 transition ${focusRing}`;

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN",
  "MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
] as const;

const ID_TYPES = [
  "Driver’s License",
  "State ID",
  "Passport",
  "Military ID",
  "Other",
] as const;

const schema = z
  .object({
    taxpayer: z.object({
      hasNoId: z.boolean().default(false),
      doesNotWantToProvide: z.boolean().default(false),

      type: z.enum(ID_TYPES).default("Driver’s License"),
      number: z.string().trim().default(""),
      state: z.enum(STATES).default("CA"),
      issueDate: z.string().trim().default(""),
      expirationDate: z.string().trim().default(""),
    }),

    spouse: z.object({
      enabled: z.boolean().default(false), // show spouse section only if enabled
      hasNoId: z.boolean().default(false),
      doesNotWantToProvide: z.boolean().default(false),

      type: z.enum(ID_TYPES).default("Driver’s License"),
      number: z.string().trim().default(""),
      state: z.enum(STATES).default("CA"),
      issueDate: z.string().trim().default(""),
      expirationDate: z.string().trim().default(""),
    }),
  })
  .superRefine((data, ctx) => {
    const isDate = (s: string) => s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s);

    const validatePerson = (
      who: "taxpayer" | "spouse",
      enabled: boolean,
      p: {
        hasNoId: boolean;
        doesNotWantToProvide: boolean;
        number: string;
        issueDate: string;
        expirationDate: string;
      }
    ) => {
      if (!enabled) return;

      // if either "has no id" OR "does not want to provide" is true -> skip fields
      if (p.hasNoId || p.doesNotWantToProvide) return;

      if (!p.number.trim()) {
        ctx.addIssue({
          code: "custom",
          path: [who, "number"],
          message: "ID number is required (or select one of the options below).",
        });
      }

      if (!isDate(p.issueDate)) {
        ctx.addIssue({
          code: "custom",
          path: [who, "issueDate"],
          message: "Use YYYY-MM-DD",
        });
      }
      if (!isDate(p.expirationDate)) {
        ctx.addIssue({
          code: "custom",
          path: [who, "expirationDate"],
          message: "Use YYYY-MM-DD",
        });
      }
    };

    validatePerson("taxpayer", true, data.taxpayer);
    validatePerson("spouse", data.spouse.enabled, data.spouse);
  });

export type IdentificationForTaxpayerAndSpouseValues = z.infer<typeof schema>;

const defaultValues: IdentificationForTaxpayerAndSpouseValues = {
  taxpayer: {
    hasNoId: false,
    doesNotWantToProvide: false,
    type: "Driver’s License",
    number: "",
    state: "CA",
    issueDate: "",
    expirationDate: "",
  },
  spouse: {
    enabled: false,
    hasNoId: false,
    doesNotWantToProvide: false,
    type: "Driver’s License",
    number: "",
    state: "CA",
    issueDate: "",
    expirationDate: "",
  },
};

function scrubIfOptedOut<T extends { hasNoId: boolean; doesNotWantToProvide: boolean } & Record<string, any>>(p: T) {
  if (!p.hasNoId && !p.doesNotWantToProvide) return p;
  return {
    ...p,
    number: "",
    issueDate: "",
    expirationDate: "",
  };
}

function PersonIdCard({
  title,
  subtitle,
  control,
  register,
  watchPrefix,
  setValue,
  errors,
  showSectionToggle,
  sectionEnabledValue,
  onToggleSection,
}: {
  title: string;
  subtitle?: string;
  control: any;
  register: any;
  watchPrefix: "taxpayer" | "spouse";
  setValue: (name: any, value: any, opts?: any) => void;
  errors: any;
  showSectionToggle?: boolean;
  sectionEnabledValue?: boolean;
  onToggleSection?: (v: boolean) => void;
}) {
  const hasNoId = control._formValues?.[watchPrefix]?.hasNoId ?? false;
  const doesNotWant = control._formValues?.[watchPrefix]?.doesNotWantToProvide ?? false;
  const disabled = Boolean(hasNoId || doesNotWant);

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-slate-900">{title}</CardTitle>
            <div className="mt-2 h-1 w-28 rounded-full" style={brandGradient} />
            {subtitle && <p className="mt-3 text-sm text-slate-600">{subtitle}</p>}
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <ShieldCheck className="h-4 w-4" />
            Protected
          </div>
        </div>

        {showSectionToggle && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-white"
                style={brandGradient}
              >
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Include spouse ID</p>
                <p className="text-xs text-slate-600">Turn on if you are filing jointly or need spouse info.</p>
              </div>
            </div>

            <Switch checked={!!sectionEnabledValue} onCheckedChange={(v) => onToggleSection?.(v)} />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label className="text-slate-700">Type</Label>
            <Controller
              control={control}
              name={`${watchPrefix}.type`}
              render={({ field }: any) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label className="text-slate-700">Number</Label>
            <Input
              className="mt-1"
              disabled={disabled}
              placeholder="ID number"
              {...register(`${watchPrefix}.number`)}
            />
            {errors?.[watchPrefix]?.number && (
              <p className="mt-1 text-xs text-red-600">{errors[watchPrefix].number.message}</p>
            )}
          </div>

          <div>
            <Label className="text-slate-700">State</Label>
            <Controller
              control={control}
              name={`${watchPrefix}.state`}
              render={({ field }: any) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label className="text-slate-700">Issue Date</Label>
            <Input className="mt-1" type="date" disabled={disabled} {...register(`${watchPrefix}.issueDate`)} />
            {errors?.[watchPrefix]?.issueDate && (
              <p className="mt-1 text-xs text-red-600">{errors[watchPrefix].issueDate.message}</p>
            )}
          </div>

          <div>
            <Label className="text-slate-700">Expiration Date</Label>
            <Input className="mt-1" type="date" disabled={disabled} {...register(`${watchPrefix}.expirationDate`)} />
            {errors?.[watchPrefix]?.expirationDate && (
              <p className="mt-1 text-xs text-red-600">{errors[watchPrefix].expirationDate.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    I do not have a driver’s license or state-issued photo ID
                  </p>
                  <p className="mt-1 text-xs text-slate-600">Selecting this will clear the ID fields.</p>
                </div>
                <Controller
                  control={control}
                  name={`${watchPrefix}.hasNoId`}
                  render={({ field }: any) => (
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={(v) => {
                        field.onChange(v);
                        if (v) {
                          setValue(`${watchPrefix}.doesNotWantToProvide`, false, { shouldDirty: true });
                          setValue(`${watchPrefix}.number`, "", { shouldDirty: true });
                          setValue(`${watchPrefix}.issueDate`, "", { shouldDirty: true });
                          setValue(`${watchPrefix}.expirationDate`, "", { shouldDirty: true });
                        }
                      }}
                    />
                  )}
                />
              </label>

              <label className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    I do not want to provide my driver’s license or state-issued photo ID
                  </p>
                  <p className="mt-1 text-xs text-slate-600">Selecting this will clear the ID fields.</p>
                </div>
                <Controller
                  control={control}
                  name={`${watchPrefix}.doesNotWantToProvide`}
                  render={({ field }: any) => (
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={(v) => {
                        field.onChange(v);
                        if (v) {
                          setValue(`${watchPrefix}.hasNoId`, false, { shouldDirty: true });
                          setValue(`${watchPrefix}.number`, "", { shouldDirty: true });
                          setValue(`${watchPrefix}.issueDate`, "", { shouldDirty: true });
                          setValue(`${watchPrefix}.expirationDate`, "", { shouldDirty: true });
                        }
                      }}
                    />
                  )}
                />
              </label>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          If you toggle either option, ID details will be skipped and fields will be cleared for privacy.
        </p>
      </CardContent>
    </Card>
  );
}

export default function IdentificationForTaxpayerAndSpouse({
  initialValues,
  onSave,
  onBack,
  saveLabel = "Save",
}: {
  initialValues?: Partial<IdentificationForTaxpayerAndSpouseValues>;
  onSave?: (values: IdentificationForTaxpayerAndSpouseValues) => Promise<void> | void;
  onBack?: () => void;
  saveLabel?: string;
}) {
  const [msg, setMsg] = React.useState("");

  // ✅ match your earlier fix style (avoids resolver optional/required mismatch)
  const resolver: Resolver<IdentificationForTaxpayerAndSpouseValues> =
    zodResolver(schema) as unknown as Resolver<IdentificationForTaxpayerAndSpouseValues>;

  const form = useForm<IdentificationForTaxpayerAndSpouseValues>({
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
    formState: { errors, isSubmitting },
  } = form;

  const spouseEnabled = watch("spouse.enabled");

  const submit: SubmitHandler<IdentificationForTaxpayerAndSpouseValues> = async (values) => {
    setMsg("");

    const payload: IdentificationForTaxpayerAndSpouseValues = {
      taxpayer: scrubIfOptedOut(values.taxpayer),
      spouse: values.spouse.enabled ? scrubIfOptedOut(values.spouse) : { ...values.spouse },
    };

    if (!payload.spouse.enabled) {
      payload.spouse = { ...payload.spouse, hasNoId: false, doesNotWantToProvide: false };
      payload.spouse.number = "";
      payload.spouse.issueDate = "";
      payload.spouse.expirationDate = "";
    }

    if (onSave) {
      await onSave(payload);
      setMsg("Saved.");
      return;
    }

    const res = await fetch("/api/identification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save identification info");
    }

    setMsg("Saved.");
  };

  return (
    <div className="space-y-6">
      {msg && <p className="text-sm text-slate-600">{msg}</p>}

      <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
        <PersonIdCard
          title="Taxpayer’s Driver’s License or State-Issued Photo ID"
          subtitle="Provide ID details (optional). If you don’t have one or don’t want to share it, toggle the options below."
          control={control}
          register={register}
          watchPrefix="taxpayer"
          setValue={setValue}
          errors={errors}
        />

        <PersonIdCard
          title="Spouse’s Driver’s License or State-Issued Photo ID"
          subtitle="Optional spouse ID details (only if spouse section is enabled)."
          control={control}
          register={register}
          watchPrefix="spouse"
          setValue={setValue}
          errors={errors}
          showSectionToggle
          sectionEnabledValue={spouseEnabled}
          onToggleSection={(v) => setValue("spouse.enabled", v, { shouldDirty: true })}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
              Back
            </Button>
          )}

          <Button type="submit" className="text-white hover:opacity-90" style={brandGradient} disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : saveLabel}
          </Button>
        </div>
      </form>

      <p className="text-xs text-slate-500">
        Dates are optional unless you provide an ID number. If provided, use YYYY-MM-DD format.
      </p>
    </div>
  );
}
