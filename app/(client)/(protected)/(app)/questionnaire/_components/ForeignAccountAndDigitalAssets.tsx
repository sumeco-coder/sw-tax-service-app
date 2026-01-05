// app/(client)/_components/ForeignAccountAndDigitalAssets.tsx
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
import { Globe, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const YESNO = ["yes", "no"] as const;

const schema = z.object({
  // Page 1
  digitalAssetActivity: z.enum(YESNO).default("no"),
  hadForeignAccountOrTrust: z.enum(YESNO).default("no"),
  foreignTrustActivityPage1: z.enum(YESNO).default("no"),

  // Page 2
  hadForeignFinancialAccount: z.enum(YESNO).default("no"),
  requiredToFileFBAR: z.enum(YESNO).default("no"),
  foreignCountry1: z.string().trim().default(""),
  foreignCountry2: z.string().trim().default(""),
  foreignTrustActivityPage2: z.enum(YESNO).default("no"),
})
.superRefine((data, ctx) => {
  // If they say they had foreign financial accounts, ask about FBAR explicitly (already required, but keep safe)
  if (data.hadForeignFinancialAccount === "yes" && !data.requiredToFileFBAR) {
    // enum always set, so nothing to do
  }

  // If FBAR = yes, require at least one country
  if (data.requiredToFileFBAR === "yes") {
    if (!data.foreignCountry1.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["foreignCountry1"],
        message: "Select at least one foreign country.",
      });
    }
  }

  // If Page 1 they said NO foreign account/trust, then Page 1 trust follow-up can be no, but don't force
});

export type ForeignAccountAndDigitalAssetsValues = z.infer<typeof schema>;

const defaultValues: ForeignAccountAndDigitalAssetsValues = {
  digitalAssetActivity: "no",
  hadForeignAccountOrTrust: "no",
  foreignTrustActivityPage1: "no",

  hadForeignFinancialAccount: "no",
  requiredToFileFBAR: "no",
  foreignCountry1: "",
  foreignCountry2: "",
  foreignTrustActivityPage2: "no",
};

// Minimal country list (expand anytime)
const COUNTRIES = [
  "Canada",
  "Mexico",
  "United Kingdom",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Ireland",
  "Netherlands",
  "Switzerland",
  "Sweden",
  "Norway",
  "Denmark",
  "Portugal",
  "Poland",
  "Greece",
  "Turkey",
  "Israel",
  "United Arab Emirates",
  "Saudi Arabia",
  "India",
  "Pakistan",
  "China",
  "Japan",
  "South Korea",
  "Philippines",
  "Vietnam",
  "Thailand",
  "Australia",
  "New Zealand",
  "South Africa",
  "Nigeria",
  "Ghana",
  "Kenya",
  "Brazil",
  "Argentina",
  "Colombia",
  "Jamaica",
  "Dominican Republic",
] as const;

function YesNoRow({
  label,
  name,
  control,
}: {
  label: string;
  name:
    | "digitalAssetActivity"
    | "hadForeignAccountOrTrust"
    | "foreignTrustActivityPage1"
    | "hadForeignFinancialAccount"
    | "requiredToFileFBAR"
    | "foreignTrustActivityPage2";
  control: any;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Label className="text-sm font-medium text-slate-800">{label}</Label>
      <Controller
        control={control}
        name={name}
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

export default function ForeignAccountAndDigitalAssets({
  initialValues,
  onSave,
  saveLabel = "Save",
}: {
  initialValues?: Partial<ForeignAccountAndDigitalAssetsValues>;
  onSave?: (values: ForeignAccountAndDigitalAssetsValues) => Promise<void> | void;
  saveLabel?: string;
}) {
  // ✅ Avoid resolver type mismatch (same pattern you used earlier)
  const resolver: Resolver<ForeignAccountAndDigitalAssetsValues> =
    zodResolver(schema) as unknown as Resolver<ForeignAccountAndDigitalAssetsValues>;

  const form = useForm<ForeignAccountAndDigitalAssetsValues>({
    resolver,
    defaultValues: { ...defaultValues, ...(initialValues ?? {}) },
    mode: "onBlur",
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const hadForeignAccountOrTrust = watch("hadForeignAccountOrTrust");
  const hadForeignFinancialAccount = watch("hadForeignFinancialAccount");
  const requiredToFileFBAR = watch("requiredToFileFBAR");

  // small UX: when they flip some to "no", clear dependent fields
  React.useEffect(() => {
    if (hadForeignAccountOrTrust === "no") {
      setValue("foreignTrustActivityPage1", "no", { shouldDirty: true });
    }
  }, [hadForeignAccountOrTrust, setValue]);

  React.useEffect(() => {
    if (hadForeignFinancialAccount === "no") {
      setValue("requiredToFileFBAR", "no", { shouldDirty: true });
      setValue("foreignCountry1", "", { shouldDirty: true });
      setValue("foreignCountry2", "", { shouldDirty: true });
    }
  }, [hadForeignFinancialAccount, setValue]);

  React.useEffect(() => {
    if (requiredToFileFBAR === "no") {
      setValue("foreignCountry1", "", { shouldDirty: true });
      setValue("foreignCountry2", "", { shouldDirty: true });
    }
  }, [requiredToFileFBAR, setValue]);

  const submit: SubmitHandler<ForeignAccountAndDigitalAssetsValues> = async (values) => {
    if (onSave) {
      await onSave(values);
      return;
    }

    // Default endpoint (change to your backend route)
    const res = await fetch("/api/foreign-accounts-digital-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save foreign account/digital asset info");
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-slate-900">Foreign Account & Digital Assets</CardTitle>
              <div className="mt-2 h-1 w-28 rounded-full" style={brandGradient} />
              <p className="mt-3 text-sm text-slate-600">
                Answer these questions for 2025. (Used for filing questions like digital asset activity and foreign account reporting.)
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Secure
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Tabs defaultValue="page1">
            <TabsList className="grid grid-cols-2 rounded-xl bg-white p-1 ring-1 ring-slate-200">
              <TabsTrigger
                value="page1"
                className="rounded-lg data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]"
              >
                Page 1
              </TabsTrigger>
              <TabsTrigger
                value="page2"
                className="rounded-lg data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#E72B69] data-[state=active]:to-[#BA4A26]"
              >
                Page 2
              </TabsTrigger>
            </TabsList>

            {/* ---------------- Page 1 ---------------- */}
            <TabsContent value="page1" className="mt-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Globe className="h-4 w-4" />
                Digital asset and foreign trust overview
              </div>

              <YesNoRow
                control={control}
                name="digitalAssetActivity"
                label={`At any time during 2025, did you receive (as a reward, award, or payment) or sell, exchange, give, or otherwise dispose of a digital asset (or any financial interest in a digital asset)?`}
              />

              <YesNoRow
                control={control}
                name="hadForeignAccountOrTrust"
                label="Did you have an interest in or authority over any foreign account or trust?"
              />

              {hadForeignAccountOrTrust === "yes" && (
                <YesNoRow
                  control={control}
                  name="foreignTrustActivityPage1"
                  label="During 2025, did you receive a distribution from or was the grantor of, or transfer to, a foreign trust?"
                />
              )}
            </TabsContent>

            {/* ---------------- Page 2 ---------------- */}
            <TabsContent value="page2" className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Foreign account reporting (FBAR)</p>
                <p className="mt-1 text-xs text-slate-600">
                  This helps determine whether foreign accounts may need additional reporting (FinCEN Form 114 / FBAR).
                </p>
              </div>

              <YesNoRow
                control={control}
                name="hadForeignFinancialAccount"
                label="At any time during 2025, did the taxpayer have a financial interest in or signature authority over a financial account located in a foreign country?"
              />

              {hadForeignFinancialAccount === "yes" && (
                <>
                  <YesNoRow
                    control={control}
                    name="requiredToFileFBAR"
                    label="Are you required to file FinCEN Form 114 (FBAR) to report that financial interest or signature authority?"
                  />

                  {requiredToFileFBAR === "yes" && (
                    <div className="space-y-4 rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50/50">
                      <Label className="text-sm font-medium text-slate-800">
                        Enter the name of the foreign country(ies)
                      </Label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Country 1 */}
                        <div className="space-y-2">
                          <Controller
                            control={control}
                            name="foreignCountry1"
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className={errors.foreignCountry1 ? "border-red-500" : ""}>
                                  <SelectValue placeholder="Select Country 1" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.foreignCountry1 && (
                            <p className="text-xs text-red-500">{errors.foreignCountry1.message}</p>
                          )}
                        </div>

                        {/* Country 2 */}
                        <div className="space-y-2">
                          <Controller
                            control={control}
                            name="foreignCountry2"
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Country 2 (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <YesNoRow
                    control={control}
                    name="foreignTrustActivityPage2"
                    label="Did you receive a distribution from, or were you the grantor of, or transferor to, a foreign trust?"
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>

        <div className="border-t border-slate-100 p-6 bg-slate-50/30">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[120px] text-white transition-all hover:opacity-90"
            style={brandGradient}
          >
            {isSubmitting ? "Saving..." : saveLabel}
          </Button>
        </div>
      </Card>
    </form>
  );
}
