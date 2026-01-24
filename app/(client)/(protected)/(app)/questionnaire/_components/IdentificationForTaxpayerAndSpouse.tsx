// app/(client)/questionnaire/_components/IdentificationForTaxpayerAndSpouse.tsx
"use client";

import * as React from "react";
import {
  useForm,
  Controller,
  type Resolver,
  type SubmitHandler,
  useWatch,
} from "react-hook-form";
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

/* ---------------- brand ---------------- */

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

/* ---------------- constants ---------------- */

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

/* ---------------- schema ---------------- */

const schema = z
  .object({
    taxpayer: z.object({
      hasNoId: z.boolean().default(false),
      doesNotWantToProvide: z.boolean().default(false),

      type: z.enum(ID_TYPES).default("Driver’s License"),
      number: z.string().trim().default(""), // full number (encrypted on server)
      state: z.enum(STATES).default("CA"),
      issueDate: z.string().trim().default(""),       // YYYY-MM-DD or ""
      expirationDate: z.string().trim().default(""),  // YYYY-MM-DD or ""
    }),

    spouse: z.object({
      enabled: z.boolean().default(false),
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

function scrubIfOptedOut<
  T extends { hasNoId: boolean; doesNotWantToProvide: boolean } & Record<string, any>
>(p: T) {
  if (!p.hasNoId && !p.doesNotWantToProvide) return p;
  return {
    ...p,
    number: "",
    issueDate: "",
    expirationDate: "",
  };
}

/* ---------------- UI helpers ---------------- */

function Last4Hint({ last4 }: { last4?: string }) {
  if (!last4) return null;
  return (
    <span className="ml-2 text-[11px] text-slate-500">
      (on file ending in <span className="font-semibold">{last4}</span>)
    </span>
  );
}

/* ---------------- subcomponent ---------------- */

function PersonIdCard(props: {
  title: string;
  subtitle?: string;
  control: any;
  register: any;
  setValue: (name: any, value: any, opts?: any) => void;
  errors: any;

  prefix: "taxpayer" | "spouse";
  enabled: boolean; // spouse.enabled controls this; taxpayer always true

  showSectionToggle?: boolean;
  sectionEnabledValue?: boolean;
  onToggleSection?: (v: boolean) => void;

  last4?: string;
}) {
  const {
    title,
    subtitle,
    control,
    register,
    setValue,
    errors,
    prefix,
    enabled,
    showSectionToggle,
    sectionEnabledValue,
    onToggleSection,
    last4,
  } = props;

  const hasNoId = useWatch({ control, name: `${prefix}.hasNoId` }) as boolean;
  const doesNotWant = useWatch({
    control,
    name: `${prefix}.doesNotWantToProvide`,
  }) as boolean;

  const disabled = !enabled || Boolean(hasNoId || doesNotWant);

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
                <p className="text-xs text-slate-600">
                  Turn on if you are filing jointly or need spouse info.
                </p>
              </div>
            </div>

            <Switch checked={!!sectionEnabledValue} onCheckedChange={(v) => onToggleSection?.(v)} />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {!enabled ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Turn on <span className="font-semibold">Include spouse ID</span> to enter spouse details.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label className="text-slate-700">Type</Label>
            <Controller
              control={control}
              name={`${prefix}.type`}
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
            <Label className="text-slate-700">
              Number <Last4Hint last4={last4} />
            </Label>
            <Input
              className="mt-1"
              disabled={disabled}
              placeholder="ID number"
              {...register(`${prefix}.number`)}
              autoComplete="off"
            />
            {errors?.[prefix]?.number && (
              <p className="mt-1 text-xs text-red-600">{errors[prefix].number.message}</p>
            )}
          </div>

          <div>
            <Label className="text-slate-700">State</Label>
            <Controller
              control={control}
              name={`${prefix}.state`}
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
            <Input
              className="mt-1"
              type="date"
              disabled={disabled}
              {...register(`${prefix}.issueDate`)}
            />
            {errors?.[prefix]?.issueDate && (
              <p className="mt-1 text-xs text-red-600">{errors[prefix].issueDate.message}</p>
            )}
          </div>

          <div>
            <Label className="text-slate-700">Expiration Date</Label>
            <Input
              className="mt-1"
              type="date"
              disabled={disabled}
              {...register(`${prefix}.expirationDate`)}
            />
            {errors?.[prefix]?.expirationDate && (
              <p className="mt-1 text-xs text-red-600">{errors[prefix].expirationDate.message}</p>
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
                  name={`${prefix}.hasNoId`}
                  render={({ field }: any) => (
                    <Switch
                      checked={!!field.value}
                      disabled={!enabled}
                      onCheckedChange={(v) => {
                        field.onChange(v);
                        if (v) {
                          setValue(`${prefix}.doesNotWantToProvide`, false, { shouldDirty: true });
                          setValue(`${prefix}.number`, "", { shouldDirty: true });
                          setValue(`${prefix}.issueDate`, "", { shouldDirty: true });
                          setValue(`${prefix}.expirationDate`, "", { shouldDirty: true });
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
                  name={`${prefix}.doesNotWantToProvide`}
                  render={({ field }: any) => (
                    <Switch
                      checked={!!field.value}
                      disabled={!enabled}
                      onCheckedChange={(v) => {
                        field.onChange(v);
                        if (v) {
                          setValue(`${prefix}.hasNoId`, false, { shouldDirty: true });
                          setValue(`${prefix}.number`, "", { shouldDirty: true });
                          setValue(`${prefix}.issueDate`, "", { shouldDirty: true });
                          setValue(`${prefix}.expirationDate`, "", { shouldDirty: true });
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

/* ---------------- main component ---------------- */

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
  const [loadingSaved, setLoadingSaved] = React.useState(true);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const didLoadRef = React.useRef(false);

  const [last4, setLast4] = React.useState<{ taxpayer?: string; spouse?: string }>({});

  const resolver: Resolver<IdentificationForTaxpayerAndSpouseValues> =
    zodResolver(schema) as unknown as Resolver<IdentificationForTaxpayerAndSpouseValues>;

  const form = useForm<IdentificationForTaxpayerAndSpouseValues>({
    resolver,
    defaultValues: {
      ...defaultValues,
      ...(initialValues ?? {}),
      taxpayer: { ...defaultValues.taxpayer, ...(initialValues?.taxpayer ?? {}) },
      spouse: { ...defaultValues.spouse, ...(initialValues?.spouse ?? {}) },
    },
    mode: "onBlur",
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const spouseEnabled = useWatch({ control, name: "spouse.enabled" }) as boolean;

  // ✅ Load saved values on mount (like education credit)
  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingSaved(true);
        setLoadErr(null);

        const res = await fetch("/api/identification", { method: "GET" });
        if (!res.ok) {
          didLoadRef.current = true;
          return;
        }

        const json = await res.json().catch(() => null);
        if (!alive || !json?.ok || !json?.data) {
          didLoadRef.current = true;
          return;
        }

        // server returns { ok:true, data:{taxpayer, spouse}, meta:{taxpayerLast4, spouseLast4} }
        const merged: IdentificationForTaxpayerAndSpouseValues = {
          taxpayer: {
            ...defaultValues.taxpayer,
            ...(initialValues?.taxpayer ?? {}),
            ...(json.data.taxpayer ?? {}),
          },
          spouse: {
            ...defaultValues.spouse,
            ...(initialValues?.spouse ?? {}),
            ...(json.data.spouse ?? {}),
          },
        };

        // ✅ never hydrate the full ID number back into the input
        merged.taxpayer.number = "";
        merged.spouse.number = "";

        reset(merged, { keepDirty: false, keepTouched: false });

        setLast4({
          taxpayer: String(json?.meta?.taxpayerLast4 ?? ""),
          spouse: String(json?.meta?.spouseLast4 ?? ""),
        });

        didLoadRef.current = true;
      } catch (e: any) {
        if (!alive) return;
        setLoadErr(e?.message ?? "Failed to load saved identification.");
        didLoadRef.current = true;
      } finally {
        if (!alive) return;
        setLoadingSaved(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [reset, initialValues]);

  const submit: SubmitHandler<IdentificationForTaxpayerAndSpouseValues> = async (values) => {
    setMsg("");

    const payload: IdentificationForTaxpayerAndSpouseValues = {
      taxpayer: scrubIfOptedOut(values.taxpayer),
      spouse: values.spouse.enabled
        ? scrubIfOptedOut(values.spouse)
        : {
            ...values.spouse,
            hasNoId: false,
            doesNotWantToProvide: false,
            number: "",
            issueDate: "",
            expirationDate: "",
          },
    };

    // if spouse disabled, force-clear to avoid stale values
    if (!payload.spouse.enabled) {
      payload.spouse = {
        ...payload.spouse,
        enabled: false,
        hasNoId: false,
        doesNotWantToProvide: false,
        number: "",
        issueDate: "",
        expirationDate: "",
      };
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

    // refresh last4 from server after save (optional but nice)
    try {
      const reload = await fetch("/api/identification", { method: "GET" });
      const json = await reload.json().catch(() => null);
      if (json?.ok) {
        setLast4({
          taxpayer: String(json?.meta?.taxpayerLast4 ?? ""),
          spouse: String(json?.meta?.spouseLast4 ?? ""),
        });
      }
    } catch {
      // ignore
    }

    // clear inputs after successful save (privacy)
    reset(
      {
        ...values,
        taxpayer: { ...values.taxpayer, number: "" },
        spouse: { ...values.spouse, number: "" },
      },
      { keepDirty: false, keepTouched: true }
    );

    setMsg("Saved.");
  };

  return (
    <div className="space-y-6">
      {loadingSaved ? (
        <p className="text-sm text-slate-600">Loading saved identification…</p>
      ) : null}

      {loadErr ? <p className="text-sm text-red-600">{loadErr}</p> : null}
      {msg ? <p className="text-sm text-slate-600">{msg}</p> : null}

      <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
        <PersonIdCard
          title="Taxpayer’s Driver’s License or State-Issued Photo ID"
          subtitle="Provide ID details. If you don’t have one or don’t want to share it, toggle the options below."
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
          prefix="taxpayer"
          enabled={true}
          last4={last4.taxpayer}
        />

        <PersonIdCard
          title="Spouse’s Driver’s License or State-Issued Photo ID"
          subtitle="Optional spouse ID details (only if spouse section is enabled)."
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
          prefix="spouse"
          enabled={!!spouseEnabled}
          showSectionToggle
          sectionEnabledValue={spouseEnabled}
          onToggleSection={(v) => {
            setValue("spouse.enabled", v, { shouldDirty: true });

            if (!v) {
              // clear spouse values when turning OFF
              setValue("spouse.hasNoId", false, { shouldDirty: true });
              setValue("spouse.doesNotWantToProvide", false, { shouldDirty: true });
              setValue("spouse.number", "", { shouldDirty: true });
              setValue("spouse.issueDate", "", { shouldDirty: true });
              setValue("spouse.expirationDate", "", { shouldDirty: true });
            }
          }}
          last4={last4.spouse}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
              Back
            </Button>
          )}

          <Button
            type="submit"
            className="text-white hover:opacity-90"
            style={brandGradient}
            disabled={isSubmitting || loadingSaved}
          >
            {isSubmitting ? "Saving…" : saveLabel}
          </Button>
        </div>
      </form>

      <p className="text-xs text-slate-500">
        For privacy, full ID numbers won’t re-appear after refresh. If an ID is saved, you’ll see “on file ending in ____”.
      </p>
    </div>
  );
}
