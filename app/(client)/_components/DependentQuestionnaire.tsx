"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getCurrentUser } from "aws-amplify/auth";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

//
// -----------------------------
// Schema & Types (Zod Validation)
// -----------------------------
const schema = z.object({
  indexNumber: z.string().optional(),
  firstName: z.string().min(1, "Required"),
  middleInitial: z.string().max(1).optional(),
  lastName: z.string().min(1, "Required"),
  suffix: z.string().optional(),
  dob: z.string().optional(),
  dod: z.string().optional(),
  ssn: z.string().regex(/^\d{9}$/, { message: "Enter 9 digits" }).optional(),
  monthsInHome: z.string().optional(),
  relationship: z.string().optional(),
  appliedButNotReceived: z.boolean().default(false),
  bornAndDied2025NoSSN: z.boolean().default(false),
  ssnNotValidForWork: z.boolean().default(false),
  birthCert: z.any().optional(),
  deathCert: z.any().optional(),
  hospitalDocs: z.any().optional(),
  ipPin: z.string().optional(),
  childcareExpensesPaid: z.coerce.number().min(0).optional(),
  childcareProvidedByEmployer: z.coerce.number().min(0).optional(),
  includeOn2441NoExpenses: z.boolean().default(false),
  doesNotQualifyEIC: z.boolean().default(false),
  over18Under24Student: z.boolean().default(false),
  disabled: z.boolean().default(false),
  livedWithTaxpayer: z.boolean().default(false),
  notLiveDueToDivorce: z.boolean().default(false),
  otherTypeDependent: z.boolean().default(false),
  notDependent: z.boolean().default(false),
  notDependentHOHQualifier: z.boolean().default(false),
  notDependentQSSQualifier: z.boolean().default(false),
  doNotUpdateNextYear: z.boolean().default(false),
  itinSpecialCircumstance: z.boolean().default(false),
  ipPinPage2: z.string().optional(),
  eitherTrueUnmarriedOrJointRefund: z.enum(["yes", "no"]).optional(),
  livedMoreThanHalfUS: z.enum(["yes", "no"]).optional(),
  askedWhyParentNotClaiming: z.enum(["yes", "no", "na"]).optional(),
  couldAnotherPersonClaim: z.enum(["yes", "no"]).optional(),
  relationshipToOther: z.string().optional(),
  tiebreakerQualifyingChild: z.enum(["yes", "no", "na"]).optional(),
  qualifyingPersonCitizenResident: z.enum(["yes", "no"]).optional(),
  explainedACTCHalfYearRule: z.enum(["yes", "no", "na"]).optional(),
  explainedDivorcedRules8332: z.enum(["yes", "no", "na"]).optional(),
  residencyDocs: z.record(z.boolean()).default({}),
  disabilityDocs: z.record(z.boolean()).default({}),
  residencyOtherText: z.string().optional(),
  disabilityOtherText: z.string().optional(),
  preparerNotes: z.string().optional(),
  verifiedBy: z.string().optional(),
  verifiedDate: z.string().optional(),
});

export type DependentQuestionnaireValues = z.infer<typeof schema>;

//
// -----------------------------
// Default Values
// -----------------------------
const defaultValues: Partial<DependentQuestionnaireValues> = {
  monthsInHome: "12",
  residencyDocs: {},
  disabilityDocs: {},
  indexNumber: undefined,
  appliedButNotReceived: false,
  bornAndDied2025NoSSN: false,
  ssnNotValidForWork: false,
  includeOn2441NoExpenses: false,
  doesNotQualifyEIC: false,
  over18Under24Student: false,
  disabled: false,
  livedWithTaxpayer: false,
  notLiveDueToDivorce: false,
  otherTypeDependent: false,
  notDependent: false,
  notDependentHOHQualifier: false,
  notDependentQSSQualifier: false,
  doNotUpdateNextYear: false,
  itinSpecialCircumstance: false,
};

//
// -----------------------------
// Helper UI Components
// -----------------------------
const FieldRow = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
);

const SwitchRow = ({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean | undefined;
  onCheckedChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between rounded-xl border p-3">
    <Label className="text-sm font-medium">{label}</Label>
    <Switch checked={!!checked} onCheckedChange={onCheckedChange} />
  </div>
);

//
// -----------------------------
// Main Component
// -----------------------------
export default function DependentQuestionnaire({
  onSave,
}: {
  onSave?: (values: DependentQuestionnaireValues & { userId?: string; email?: string }) => Promise<void> | void;
}) {
  const form = useForm<DependentQuestionnaireValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
    mode: "onBlur",
  });

  const { control, register, handleSubmit, setValue, watch, formState } = form;
  const couldAnother = watch("couldAnotherPersonClaim");

  //
  // -----------------------------
  // Submit handler
  // -----------------------------
  const onSubmit = async (values: DependentQuestionnaireValues) => {
    if (values.ipPin && !values.ipPinPage2) values.ipPinPage2 = values.ipPin;

    let userId: string | undefined;
    let email: string | undefined;

    try {
      const user = await getCurrentUser();
      userId = (user as any)?.userId ?? (user as any)?.username;
      email = (user as any)?.signInDetails?.loginId;
    } catch {
      // user not logged in
    }

    const payload = { ...values, userId, email };

    if (onSave) {
      await onSave(payload);
      return;
    }

    await fetch("/api/dependents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  //
  // -----------------------------
  // JSX Rendering
  // -----------------------------
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Tabs defaultValue="page1">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="page1">Page 1 – Basic</TabsTrigger>
          <TabsTrigger value="page2">Page 2 – Childcare & EIC</TabsTrigger>
          <TabsTrigger value="page3">Page 3 – Verification</TabsTrigger>
        </TabsList>

        {/* ------- Page 1 ------- */}
        <TabsContent value="page1">
          <Card>
            <CardHeader>
              <CardTitle>Dependent Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldRow>
                <div>
                  <Label>First Name</Label>
                  <Input {...register("firstName")} />
                </div>
                <div>
                  <Label>Middle Initial</Label>
                  <Input {...register("middleInitial")} maxLength={1} />
                </div>
              </FieldRow>
              <FieldRow>
                <div>
                  <Label>Last Name</Label>
                  <Input {...register("lastName")} />
                </div>
                <div>
                  <Label>Suffix</Label>
                  <Select onValueChange={(v) => setValue("suffix", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Jr.", "Sr.", "II", "III", "IV", "None"].map((opt) => (
                        <SelectItem key={opt} value={opt === "None" ? "" : opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FieldRow>

              <FieldRow>
                <div>
                  <Label>Social Security Number</Label>
                  <Input inputMode="numeric" maxLength={9} {...register("ssn")} />
                </div>
                <div>
                  <Label>Months in Home</Label>
                  <Select defaultValue="12" onValueChange={(v) => setValue("monthsInHome", v)}>
                    <SelectTrigger><SelectValue placeholder="Select months" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 13 }).map((_, i) => (
                        <SelectItem key={i} value={String(i)}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FieldRow>

              <Controller
                control={control}
                name="appliedButNotReceived"
                render={({ field }) => (
                  <SwitchRow 
                    label="SSN or ITIN applied for but not yet received" 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="reset" variant="outline" onClick={() => form.reset(defaultValues)}>
          Reset
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
