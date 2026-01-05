// app/(site)/_components/types.ts
import { FilingStatus } from "@/lib/tax/taxYears";

export type W2Entry = {
  id: string;
  employerName?: string;
  wages: number;
  federalWithholding: number;
};

export type CalculatorState = {
  filingStatus: FilingStatus;
  w2Income: number;
  selfEmployedIncome: number;
  withholding: number;
  email?: string;
  dependentsCount?: number;
  otherDependentsCount?: number;
   w2s?: W2Entry[];
   additionalWithholding?: number;
};

export type AccessState = {
  hasPaidForPlan?: boolean;
  filingClient?: boolean;
};
