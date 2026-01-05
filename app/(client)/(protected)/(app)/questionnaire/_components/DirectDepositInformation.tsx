// app/(client)/questionnaire/_components/DirectDepositInformation.tsx
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
import { ShieldCheck, Eye, EyeOff, Landmark } from "lucide-react";

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

function digitsOnly(v: unknown, maxLen: number) {
  return String(v ?? "").replace(/\D/g, "").slice(0, maxLen);
}

/**
 * ABA routing number checksum:
 * (3*(d1+d4+d7) + 7*(d2+d5+d8) + (d3+d6+d9)) % 10 === 0
 */
function isValidAbaRouting(routing: string) {
  if (!/^\d{9}$/.test(routing)) return false;
  const d = routing.split("").map((x) => Number(x));
  const sum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    1 * (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

const ACCOUNT_TYPES = ["checking", "savings"] as const;

const schema = z
  .object({
    useDirectDeposit: z.boolean().default(true),

    accountHolderName: z.string().trim().default(""),
    bankName: z.string().trim().default(""),

    accountType: z.enum(ACCOUNT_TYPES).default("checking"),

    routingNumber: z
      .string()
      .default("")
      .transform((v) => digitsOnly(v, 9))
      .refine((v) => v === "" || v.length === 9, { message: "Routing must be 9 digits" }),

    accountNumber: z
      .string()
      .default("")
      .transform((v) => digitsOnly(v, 17))
      .refine((v) => v === "" || (v.length >= 4 && v.length <= 17), {
        message: "Account number must be 4–17 digits",
      }),

    confirmAccountNumber: z
      .string()
      .default("")
      .transform((v) => digitsOnly(v, 17)),
  })
  .superRefine((data, ctx) => {
    if (!data.useDirectDeposit) return;

    if (!data.accountHolderName.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["accountHolderName"],
        message: "Account holder name is required",
      });
    }

    if (!data.bankName.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["bankName"],
        message: "Bank name is required",
      });
    }

    if (data.routingNumber.length !== 9) {
      ctx.addIssue({
        code: "custom",
        path: ["routingNumber"],
        message: "Routing must be 9 digits",
      });
    } else if (!isValidAbaRouting(data.routingNumber)) {
      ctx.addIssue({
        code: "custom",
        path: ["routingNumber"],
        message: "Routing number doesn’t look valid",
      });
    }

    if (data.accountNumber.length < 4) {
      ctx.addIssue({
        code: "custom",
        path: ["accountNumber"],
        message: "Account number is required",
      });
    }

    if (data.accountNumber && data.confirmAccountNumber !== data.accountNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmAccountNumber"],
        message: "Account numbers do not match",
      });
    }
  });

export type DirectDepositValues = z.infer<typeof schema>;

const defaultValues: DirectDepositValues = {
  useDirectDeposit: true,
  accountHolderName: "",
  bankName: "",
  accountType: "checking",
  routingNumber: "",
  accountNumber: "",
  confirmAccountNumber: "",
};

export default function DirectDepositInformation({
  initialValues,
  onSave,
  onBack,
  saveLabel = "Save",
}: {
  initialValues?: Partial<DirectDepositValues>;
  onSave?: (values: DirectDepositValues) => Promise<void> | void;
  onBack?: () => void;
  saveLabel?: string;
}) {
  const [showNumbers, setShowNumbers] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");

  // ✅ Fix RHF/Zod resolver typing mismatch (defaults make input optional)
  const resolver: Resolver<DirectDepositValues> =
    zodResolver(schema) as unknown as Resolver<DirectDepositValues>;

  const form = useForm<DirectDepositValues>({
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

  const useDirectDeposit = watch("useDirectDeposit");

  const submit: SubmitHandler<DirectDepositValues> = async (values) => {
    setMsg("");

    // If they choose not to use direct deposit, scrub sensitive fields before sending/storing
    const payload: DirectDepositValues = values.useDirectDeposit
      ? values
      : {
          ...values,
          accountHolderName: "",
          bankName: "",
          routingNumber: "",
          accountNumber: "",
          confirmAccountNumber: "",
        };

    if (onSave) {
      await onSave(payload);
      setMsg("Saved.");
      // reduce exposure: clear account numbers after success (optional)
      setValue("accountNumber", "");
      setValue("confirmAccountNumber", "");
      return;
    }

    const res = await fetch("/api/direct-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save direct deposit info");
    }

    setValue("accountNumber", "");
    setValue("confirmAccountNumber", "");
    setMsg("Saved.");
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-slate-900">Direct Deposit Information</CardTitle>
              <div className="mt-2 h-1 w-28 rounded-full" style={brandGradient} />
              <p className="mt-3 text-sm text-slate-600">
                Provide bank details for refund direct deposit (optional).
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Encrypted & protected
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {msg && <p className="text-sm text-slate-600">{msg}</p>}

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-white"
                style={brandGradient}
              >
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Use Direct Deposit</p>
                <p className="text-xs text-slate-600">
                  Turn off if you want a paper check or you don’t have a bank account.
                </p>
              </div>
            </div>

            <Controller
              control={control}
              name="useDirectDeposit"
              render={({ field }) => (
                <Switch
                  checked={!!field.value}
                  onCheckedChange={(v) => {
                    field.onChange(v);
                    if (!v) {
                      setValue("accountHolderName", "");
                      setValue("bankName", "");
                      setValue("routingNumber", "");
                      setValue("accountNumber", "");
                      setValue("confirmAccountNumber", "");
                      setValue("accountType", "checking");
                    }
                  }}
                />
              )}
            />
          </div>

          <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
            <div className={`grid grid-cols-1 gap-4 ${useDirectDeposit ? "md:grid-cols-2" : ""}`}>
              <div>
                <Label className="text-slate-700">Account Holder Name</Label>
                <Input
                  className="mt-1"
                  disabled={!useDirectDeposit}
                  placeholder="Name on the account"
                  {...register("accountHolderName")}
                />
                {errors.accountHolderName && (
                  <p className="mt-1 text-xs text-red-600">{errors.accountHolderName.message}</p>
                )}
              </div>

              <div>
                <Label className="text-slate-700">Bank Name</Label>
                <Input
                  className="mt-1"
                  disabled={!useDirectDeposit}
                  placeholder="Bank / Credit Union"
                  {...register("bankName")}
                />
                {errors.bankName && (
                  <p className="mt-1 text-xs text-red-600">{errors.bankName.message}</p>
                )}
              </div>

              <div>
                <Label className="text-slate-700">Account Type</Label>
                <Controller
                  control={control}
                  name="accountType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!useDirectDeposit}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label className="text-slate-700">Routing Number (9 digits)</Label>
                <Input
                  className="mt-1"
                  disabled={!useDirectDeposit}
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="#########"
                  {...register("routingNumber")}
                  onChange={(e) => {
                    const v = digitsOnly(e.target.value, 9);
                    setValue("routingNumber", v, { shouldDirty: true, shouldValidate: true });
                  }}
                />
                {errors.routingNumber && (
                  <p className="mt-1 text-xs text-red-600">{errors.routingNumber.message}</p>
                )}
              </div>

              <div className={useDirectDeposit ? "" : "md:col-span-2"}>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700">Account Number</Label>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    onClick={() => setShowNumbers((s) => !s)}
                    disabled={!useDirectDeposit}
                  >
                    {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showNumbers ? "Hide" : "Show"}
                  </button>
                </div>

                <input
                  className={`${inputBase} mt-1`}
                  disabled={!useDirectDeposit}
                  inputMode="numeric"
                  maxLength={17}
                  placeholder="Account number"
                  type={showNumbers ? "text" : "password"}
                  {...register("accountNumber")}
                  onChange={(e) => {
                    const v = digitsOnly(e.target.value, 17);
                    setValue("accountNumber", v, { shouldDirty: true, shouldValidate: true });
                  }}
                />
                {errors.accountNumber && (
                  <p className="mt-1 text-xs text-red-600">{errors.accountNumber.message}</p>
                )}
              </div>

              <div className={useDirectDeposit ? "" : "md:col-span-2"}>
                <Label className="text-slate-700">Confirm Account Number</Label>
                <input
                  className={`${inputBase} mt-1`}
                  disabled={!useDirectDeposit}
                  inputMode="numeric"
                  maxLength={17}
                  placeholder="Re-enter account number"
                  type={showNumbers ? "text" : "password"}
                  {...register("confirmAccountNumber")}
                  onChange={(e) => {
                    const v = digitsOnly(e.target.value, 17);
                    setValue("confirmAccountNumber", v, { shouldDirty: true, shouldValidate: true });
                  }}
                />
                {errors.confirmAccountNumber && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirmAccountNumber.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {onBack && (
                <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                  Back
                </Button>
              )}

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
              Tip: Double-check routing/account numbers. If you’re unsure, use a voided check or your
              bank app to verify.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
