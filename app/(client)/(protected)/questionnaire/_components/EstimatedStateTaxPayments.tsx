// app/(client)/questionnaire/_components/EstimatedStateTaxPayments.tsx
"use client";

import * as React from "react";
import {
  useForm,
  type SubmitHandler,
  type Resolver,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, CalendarDays, DollarSign } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

function digitsAndDot(v: unknown) {
  return String(v ?? "").replace(/[^\d.]/g, "");
}

function isMoney(v: string) {
  if (v === "") return true;
  if (!/^\d+(\.\d{0,2})?$/.test(v)) return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

function isIsoDateOrEmpty(v: string) {
  return v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);
}

const moneyField = z
  .string()
  .default("")
  .transform((v) => digitsAndDot(v))
  .refine((v) => isMoney(v), { message: "Enter a valid amount (e.g., 250 or 250.00)" });

const dateField = z
  .string()
  .default("")
  .refine((v) => isIsoDateOrEmpty(v), { message: "Use a valid date" });

const schema = z
  .object({
    overpaymentAppliedFromPriorYear: moneyField,

    q1DatePaid: dateField,
    q1AmountPaid: moneyField,

    q2DatePaid: dateField,
    q2AmountPaid: moneyField,

    q3DatePaid: dateField,
    q3AmountPaid: moneyField,

    q4DatePaid: dateField,
    q4AmountPaid: moneyField,
  })
  .superRefine((d, ctx) => {
    const pairs: Array<
      [
        keyof typeof d,
        keyof typeof d,
        string
      ]
    > = [
      ["q1DatePaid", "q1AmountPaid", "1st Quarter"],
      ["q2DatePaid", "q2AmountPaid", "2nd Quarter"],
      ["q3DatePaid", "q3AmountPaid", "3rd Quarter"],
      ["q4DatePaid", "q4AmountPaid", "4th Quarter"],
    ];

    for (const [dateKey, amtKey, label] of pairs) {
      const date = String(d[dateKey] ?? "");
      const amt = String(d[amtKey] ?? "");
      const hasAmt = amt !== "" && Number(amt) > 0;
      const hasDate = date !== "";

      if (hasAmt && !hasDate) {
        ctx.addIssue({
          code: "custom",
          path: [dateKey],
          message: `${label}: date paid is required when amount is entered`,
        });
      }
      if (hasDate && !hasAmt) {
        ctx.addIssue({
          code: "custom",
          path: [amtKey],
          message: `${label}: amount paid is required when date is entered`,
        });
      }
    }
  });

export type EstimatedStateTaxPaymentsValues = z.infer<typeof schema>;

const defaultValues: EstimatedStateTaxPaymentsValues = {
  overpaymentAppliedFromPriorYear: "",

  q1DatePaid: "",
  q1AmountPaid: "",

  q2DatePaid: "",
  q2AmountPaid: "",

  q3DatePaid: "",
  q3AmountPaid: "",

  q4DatePaid: "",
  q4AmountPaid: "",
};

function QuarterRow({
  title,
  dateName,
  amountName,
  register,
  setValue,
  errors,
}: {
  title: string;
  dateName: keyof EstimatedStateTaxPaymentsValues;
  amountName: keyof EstimatedStateTaxPaymentsValues;
  register: any;
  setValue: any;
  errors: any;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <div className="h-1 w-16 rounded-full bg-slate-100" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label className="text-slate-700">Date Paid</Label>
          <div className="relative mt-1">
            <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-9" type="date" {...register(dateName)} />
          </div>
          {errors?.[dateName]?.message && (
            <p className="mt-1 text-xs text-red-600">{errors[dateName].message}</p>
          )}
        </div>

        <div>
          <Label className="text-slate-700">Amount Paid</Label>
          <div className="relative mt-1">
            <DollarSign className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              inputMode="decimal"
              placeholder="0.00"
              {...register(amountName)}
              onChange={(e) => {
                const v = digitsAndDot(e.target.value);
                setValue(amountName, v, { shouldDirty: true, shouldValidate: true });
              }}
            />
          </div>
          {errors?.[amountName]?.message && (
            <p className="mt-1 text-xs text-red-600">{errors[amountName].message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EstimatedStateTaxPayments({
  initialValues,
  onSave,
  onBack,
  saveLabel = "Save",
}: {
  initialValues?: Partial<EstimatedStateTaxPaymentsValues>;
  onSave?: (values: EstimatedStateTaxPaymentsValues) => Promise<void> | void;
  onBack?: () => void;
  saveLabel?: string;
}) {
  const [msg, setMsg] = React.useState("");

  // ✅ cast fixes Resolver typing mismatch
  const resolver: Resolver<EstimatedStateTaxPaymentsValues> =
    zodResolver(schema) as unknown as Resolver<EstimatedStateTaxPaymentsValues>;

  const form = useForm<EstimatedStateTaxPaymentsValues>({
    resolver,
    defaultValues: { ...defaultValues, ...(initialValues ?? {}) },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const submit: SubmitHandler<EstimatedStateTaxPaymentsValues> = async (values) => {
    setMsg("");

    if (onSave) {
      await onSave(values);
      setMsg("Saved.");
      return;
    }

    // default endpoint (adjust as needed)
    const res = await fetch("/api/estimated-state-tax-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save estimated state tax payments");
    }

    setMsg("Saved.");
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-slate-900">Estimated State Tax Payments</CardTitle>
            <div className="mt-2 h-1 w-28 rounded-full" style={brandGradient} />
            <p className="mt-3 text-sm text-slate-600">
              Enter estimated state tax payments already made for this year (optional).
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <Landmark className="h-4 w-4" />
            Year-to-date payments
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {msg && <p className="text-sm text-slate-600">{msg}</p>}

        <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Label className="text-slate-700">Overpayment applied from prior year</Label>
            <div className="relative mt-1">
              <DollarSign className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                inputMode="decimal"
                placeholder="0.00"
                {...register("overpaymentAppliedFromPriorYear")}
                onChange={(e) => {
                  const v = digitsAndDot(e.target.value);
                  setValue("overpaymentAppliedFromPriorYear", v, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
            </div>
            {errors.overpaymentAppliedFromPriorYear && (
              <p className="mt-1 text-xs text-red-600">
                {errors.overpaymentAppliedFromPriorYear.message}
              </p>
            )}
          </div>

          <QuarterRow
            title="1st Quarter"
            dateName="q1DatePaid"
            amountName="q1AmountPaid"
            register={register}
            setValue={setValue}
            errors={errors}
          />
          <QuarterRow
            title="2nd Quarter"
            dateName="q2DatePaid"
            amountName="q2AmountPaid"
            register={register}
            setValue={setValue}
            errors={errors}
          />
          <QuarterRow
            title="3rd Quarter"
            dateName="q3DatePaid"
            amountName="q3AmountPaid"
            register={register}
            setValue={setValue}
            errors={errors}
          />
          <QuarterRow
            title="4th Quarter"
            dateName="q4DatePaid"
            amountName="q4AmountPaid"
            register={register}
            setValue={setValue}
            errors={errors}
          />

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
            Tip: If you enter an amount, also enter the date paid (and vice versa).
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
