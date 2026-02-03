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
  return String(v ?? "")
    .replace(/\D/g, "")
    .slice(0, maxLen);
}

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
      .refine((v) => v === "" || v.length === 9, {
        message: "Routing must be 9 digits",
      }),
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

    if (
      data.accountNumber &&
      data.confirmAccountNumber !== data.accountNumber
    ) {
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

type OnFile = {
  routingLast4: string;
  accountLast4: string;
  updatedAt: string | null;
  hasNumbersOnFile: boolean;
};

type OnFileFull = {
  routingNumber: string;
  accountNumber: string;
};

function maskLast4(last4: string) {
  const v = String(last4 ?? "").trim();
  if (!v) return "";
  return `********${v}`;
}

export default function DirectDepositInformation({
  initialValues,
  onSave,
  onBack,
  saveLabel = "Save",
  autoLoad = true,
  revealOnFileNumbers = false, // ✅ NEW
}: {
  initialValues?: Partial<DirectDepositValues>;
  onSave?: (values: DirectDepositValues) => Promise<void> | void;
  onBack?: () => void;
  saveLabel?: string;
  autoLoad?: boolean;
  revealOnFileNumbers?: boolean;
}) {
  const [showNumbers, setShowNumbers] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");
  const [toggleSaving, setToggleSaving] = React.useState(false);
  const [loading, setLoading] = React.useState<boolean>(false);

  const [onFile, setOnFile] = React.useState<OnFile>({
    routingLast4: "",
    accountLast4: "",
    updatedAt: null,
    hasNumbersOnFile: false,
  });

  // ✅ NEW: reveal state for "On file"
  const [revealOnFile, setRevealOnFile] = React.useState(false);
  const [onFileFullLoading, setOnFileFullLoading] = React.useState(false);
  const [onFileFull, setOnFileFull] = React.useState<OnFileFull>({
    routingNumber: "",
    accountNumber: "",
  });

  const resolver: Resolver<DirectDepositValues> = zodResolver(
    schema,
  ) as unknown as Resolver<DirectDepositValues>;

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
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const useDirectDeposit = watch("useDirectDeposit");

  async function fetchSensitiveOnFile() {
    setOnFileFullLoading(true);
    try {
      const res = await fetch("/api/direct-deposit/sensitive", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load full bank details");
      }

      const data = await res.json().catch(() => ({}));
      setOnFileFull({
        routingNumber: String(data?.routingNumber ?? ""),
        accountNumber: String(data?.accountNumber ?? ""),
      });

      // also refresh last4 if present
      setOnFile({
        routingLast4: String(data?.routingLast4 ?? ""),
        accountLast4: String(data?.accountLast4 ?? ""),
        updatedAt: data?.updatedAt ? String(data.updatedAt) : null,
        hasNumbersOnFile: Boolean(data?.hasNumbersOnFile),
      });
    } finally {
      setOnFileFullLoading(false);
    }
  }

  async function toggleRevealOnFile() {
    if (!revealOnFile) {
      // only fetch sensitive when turning ON
      if (!onFileFull.routingNumber && !onFileFull.accountNumber) {
        await fetchSensitiveOnFile();
      }
    }
    setRevealOnFile((v) => !v);
  }

  async function saveToggle(nextUseDirectDeposit: boolean) {
    const payload: Partial<DirectDepositValues> = nextUseDirectDeposit
      ? { useDirectDeposit: true }
      : {
          useDirectDeposit: false,
          accountHolderName: "",
          bankName: "",
          routingNumber: "",
          accountNumber: "",
          confirmAccountNumber: "",
          accountType: "checking",
        };

    if (onSave) {
      await onSave(payload as DirectDepositValues);
      return;
    }

    const res = await fetch("/api/direct-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save toggle");
    }

    const data = await res.json().catch(() => ({}));
    setOnFile({
      routingLast4: String(data?.routingLast4 ?? ""),
      accountLast4: String(data?.accountLast4 ?? ""),
      updatedAt: data?.updatedAt ? String(data.updatedAt) : null,
      hasNumbersOnFile: Boolean(data?.hasNumbersOnFile),
    });

    if (!nextUseDirectDeposit) {
      setRevealOnFile(false);
      setOnFileFull({ routingNumber: "", accountNumber: "" });
    }
  }

  React.useEffect(() => {
    if (!initialValues) return;
    reset({
      ...defaultValues,
      ...initialValues,
      routingNumber: "",
      accountNumber: "",
      confirmAccountNumber: "",
    });

    // if parent rehydrates, hide any revealed "on file"
    setRevealOnFile(false);
    setOnFileFull({ routingNumber: "", accountNumber: "" });
  }, [initialValues, reset]);

  const loadSaved = React.useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/direct-deposit", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load direct deposit info");
      }
      const data = await res.json();

      setOnFile({
        routingLast4: String(data?.routingLast4 ?? ""),
        accountLast4: String(data?.accountLast4 ?? ""),
        updatedAt: data?.updatedAt ? String(data.updatedAt) : null,
        hasNumbersOnFile: Boolean(data?.hasNumbersOnFile),
      });

      // reset safe fields only (no full numbers)
      reset({
        ...defaultValues,
        useDirectDeposit: Boolean(data?.useDirectDeposit),
        accountHolderName: String(data?.accountHolderName ?? ""),
        bankName: String(data?.bankName ?? ""),
        accountType: data?.accountType === "savings" ? "savings" : "checking",
        routingNumber: "",
        accountNumber: "",
        confirmAccountNumber: "",
      });

      // hide any revealed "on file"
      setRevealOnFile(false);
      setOnFileFull({ routingNumber: "", accountNumber: "" });
    } finally {
      setLoading(false);
    }
  }, [reset]);

  React.useEffect(() => {
    if (!autoLoad) return;
    void loadSaved();
  }, [autoLoad, loadSaved]);

  const submit: SubmitHandler<DirectDepositValues> = async (values) => {
    setMsg("");

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

    try {
      if (onSave) {
        await onSave(payload);
        setMsg(
          "✅ Bank details saved. You can view them anytime in Profile → Bank Details.",
        );
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

      const data = await res.json().catch(() => ({}));
      setOnFile({
        routingLast4: String(data?.routingLast4 ?? ""),
        accountLast4: String(data?.accountLast4 ?? ""),
        updatedAt: data?.updatedAt ? String(data.updatedAt) : null,
        hasNumbersOnFile: Boolean(data?.hasNumbersOnFile),
      });

      // ✅ If user just saved numbers, we can set onFileFull immediately (no extra fetch)
      if (values.useDirectDeposit) {
        setOnFileFull({
          routingNumber: String(values.routingNumber ?? ""),
          accountNumber: String(values.accountNumber ?? ""),
        });
      } else {
        // ✅ turned off → clear everything
        setOnFile({ routingLast4: "", accountLast4: "", updatedAt: null, hasNumbersOnFile: false });
        setOnFileFull({ routingNumber: "", accountNumber: "" });
      }

      setMsg(
        "✅ Bank details saved. You can view them anytime in Profile → Bank Details.",
      );
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "Save failed"}`);
    }
  };

  const showOnFileRow = !!(onFile.routingLast4 || onFile.accountLast4);

  const onFileRoutingText =
    revealOnFile && onFileFull.routingNumber
      ? `Routing ${onFileFull.routingNumber}`
      : onFile.routingLast4
        ? `Routing ${maskLast4(onFile.routingLast4)}`
        : "";

  const onFileAccountText =
    revealOnFile && onFileFull.accountNumber
      ? `Account ${onFileFull.accountNumber}`
      : onFile.accountLast4
        ? `Account ${maskLast4(onFile.accountLast4)}`
        : "";

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-slate-900">
                Direct Deposit Information
              </CardTitle>
              <div
                className="mt-2 h-1 w-28 rounded-full"
                style={brandGradient}
              />
              <p className="mt-3 text-sm text-slate-600">
                Provide bank details for refund direct deposit (optional).
              </p>

              {showOnFileRow && (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-600">
                    On file: {onFileRoutingText}
                    {onFileRoutingText && onFileAccountText ? " • " : ""}
                    {onFileAccountText}
                    {onFileFullLoading ? " (loading…)" : ""}
                  </p>

                  {revealOnFileNumbers && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      onClick={() => void toggleRevealOnFile()}
                      disabled={loading || isSubmitting || onFileFullLoading}
                      aria-label={
                        revealOnFile ? "Hide bank details" : "Show bank details"
                      }
                    >
                      {revealOnFile ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {revealOnFile ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Encrypted & protected
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {msg && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {msg}
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-white"
                style={brandGradient}
              >
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Use Direct Deposit
                </p>
                <p className="text-xs text-slate-600">
                  Turn off if you want a paper check or you don’t have a bank
                  account.
                </p>
              </div>
            </div>

            <Controller
              control={control}
              name="useDirectDeposit"
              render={({ field }) => (
                <Switch
                  checked={!!field.value}
                  disabled={toggleSaving || isSubmitting || loading}
                  onCheckedChange={async (v) => {
                    const prev = !!field.value;

                    setMsg("");
                    setToggleSaving(true);

                    try {
                      field.onChange(v);

                      const hasNumbers =
                        onFile.hasNumbersOnFile ||
                        !!onFile.routingLast4 ||
                        !!onFile.accountLast4;

                      // ✅ FIX: If turning ON and nothing is on file, DO NOT POST {useDirectDeposit:true}
                      // Just let them fill details and hit Save.
                      if (v && !hasNumbers) {
                        setMsg(
                          "✅ Direct deposit selected. Enter your bank details below and click Save to enable it.",
                        );
                        return;
                      }

                      // ✅ If turning OFF, only clear local UI AFTER the server call succeeds
                      await saveToggle(v);

                      if (!v) {
                        setValue("accountHolderName", "");
                        setValue("bankName", "");
                        setValue("routingNumber", "");
                        setValue("accountNumber", "");
                        setValue("confirmAccountNumber", "");
                        setValue("accountType", "checking");

                        setOnFile({
                          routingLast4: "",
                          accountLast4: "",
                          updatedAt: null,
                          hasNumbersOnFile: false,
                        });

                        setRevealOnFile(false);
                        setOnFileFull({ routingNumber: "", accountNumber: "" });

                        setMsg(
                          "✅ Direct deposit turned off. Bank details cleared from Profile → Bank Details.",
                        );
                      } else {
                        setMsg(
                          "✅ Direct deposit enabled. If you need to update bank details, enter them and click Save.",
                        );
                      }
                    } catch (e: any) {
                      field.onChange(prev);
                      setMsg(`❌ ${e?.message ?? "Save failed"}`);
                    } finally {
                      setToggleSaving(false);
                    }
                  }}
                />
              )}
            />
          </div>

          {useDirectDeposit && !onFile.routingLast4 && !onFile.accountLast4 && (
            <p className="text-xs text-slate-600">
              To get your refund by direct deposit, enter your bank details and
              tap <span className="font-semibold">Save</span>.
            </p>
          )}

          <form
            onSubmit={handleSubmit(submit)}
            className="space-y-5"
            noValidate
          >
            <div
              className={`grid grid-cols-1 gap-4 ${
                useDirectDeposit ? "md:grid-cols-2" : ""
              }`}
            >
              <div>
                <Label className="text-slate-700">Account Holder Name</Label>
                <Input
                  className="mt-1"
                  disabled={!useDirectDeposit || loading}
                  placeholder="Name on the account"
                  {...register("accountHolderName")}
                />
                {errors.accountHolderName && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.accountHolderName.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-slate-700">Bank Name</Label>
                <Input
                  className="mt-1"
                  disabled={!useDirectDeposit || loading}
                  placeholder="Bank / Credit Union"
                  {...register("bankName")}
                />
                {errors.bankName && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.bankName.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-slate-700">Account Type</Label>
                <Controller
                  control={control}
                  name="accountType"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!useDirectDeposit || loading}
                    >
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
                <Label className="text-slate-700">
                  Routing Number (9 digits)
                </Label>
                <Input
                  className="mt-1"
                  disabled={!useDirectDeposit || loading}
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="#########"
                  {...register("routingNumber")}
                  onChange={(e) => {
                    const v = digitsOnly(e.target.value, 9);
                    setValue("routingNumber", v, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                />
                {errors.routingNumber && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.routingNumber.message}
                  </p>
                )}
              </div>

              <div className={useDirectDeposit ? "" : "md:col-span-2"}>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700">Account Number</Label>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    onClick={() => setShowNumbers((s) => !s)}
                    disabled={!useDirectDeposit || loading}
                  >
                    {showNumbers ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {showNumbers ? "Hide" : "Show"}
                  </button>
                </div>

                <input
                  className={`${inputBase} mt-1`}
                  disabled={!useDirectDeposit || loading}
                  inputMode="numeric"
                  maxLength={17}
                  placeholder="Account number"
                  type={showNumbers ? "text" : "password"}
                  {...register("accountNumber")}
                  onChange={(e) => {
                    const v = digitsOnly(e.target.value, 17);
                    setValue("accountNumber", v, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                />
                {errors.accountNumber && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.accountNumber.message}
                  </p>
                )}
              </div>

              <div className={useDirectDeposit ? "" : "md:col-span-2"}>
                <Label className="text-slate-700">Confirm Account Number</Label>
                <input
                  className={`${inputBase} mt-1`}
                  disabled={!useDirectDeposit || loading}
                  inputMode="numeric"
                  maxLength={17}
                  placeholder="Re-enter account number"
                  type={showNumbers ? "text" : "password"}
                  {...register("confirmAccountNumber")}
                  onChange={(e) => {
                    const v = digitsOnly(e.target.value, 17);
                    setValue("confirmAccountNumber", v, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                />
                {errors.confirmAccountNumber && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.confirmAccountNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isSubmitting || loading}
                >
                  Back
                </Button>
              )}

              <Button
                type="submit"
                className="text-white hover:opacity-90"
                style={brandGradient}
                disabled={isSubmitting || loading}
              >
                {isSubmitting ? "Saving…" : saveLabel}
              </Button>
            </div>

            <p className="text-xs text-slate-500">
              Tip: Double-check routing/account numbers. If you’re unsure, use a
              voided check or your bank app to verify.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
