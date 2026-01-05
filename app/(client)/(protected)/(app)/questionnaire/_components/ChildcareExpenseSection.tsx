"use client";

import * as React from "react";
import { Controller, type Control, type FieldErrors } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type ChildcareFields = {
  childcareExpensesPaid: string;
  childcareProvidedByEmployer: string;
  includeOn2441NoExpenses: boolean;
};

function moneyOnly(v: string) {
  // allow digits + one decimal point
  const cleaned = v.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

export default function ChildcareExpenseSection<T extends ChildcareFields>({
  control,
  register,
  setValue,
  errors,
}: {
  control: Control<T>;
  register: any;
  setValue: (name: any, value: any, opts?: any) => void;
  errors: FieldErrors<T>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Childcare Expense Information
        </h3>
        <p className="text-xs text-slate-600">
          Only fill this out if applicable.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-700">
            Qualifying childcare expenses incurred and paid this year
          </Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            placeholder="0.00"
            {...register("childcareExpensesPaid")}
            onChange={(e) => {
              const v = moneyOnly(e.target.value);
              setValue("childcareExpensesPaid", v, { shouldDirty: true });
            }}
          />
          {errors?.childcareExpensesPaid && (
            <p className="mt-1 text-xs text-red-600">
              {(errors.childcareExpensesPaid as any)?.message}
            </p>
          )}
        </div>

        <div>
          <Label className="text-slate-700">
            Portion of qualifying expenses provided by employer
          </Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            placeholder="0.00"
            {...register("childcareProvidedByEmployer")}
            onChange={(e) => {
              const v = moneyOnly(e.target.value);
              setValue("childcareProvidedByEmployer", v, { shouldDirty: true });
            }}
          />
          {errors?.childcareProvidedByEmployer && (
            <p className="mt-1 text-xs text-red-600">
              {(errors.childcareProvidedByEmployer as any)?.message}
            </p>
          )}
        </div>
      </div>

      <Controller
        control={control}
        name={"includeOn2441NoExpenses" as any}
        render={({ field }) => (
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            <Checkbox
              checked={!!field.value}
              onCheckedChange={(v) => field.onChange(Boolean(v))}
            />
            <span className="text-sm text-slate-800">
              Include dependent on Form 2441 without qualified expenses
            </span>
          </label>
        )}
      />
    </div>
  );
}
