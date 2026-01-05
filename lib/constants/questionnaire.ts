// lib/constants/questionnaire.ts

import DependentQuestionnaire, {
  type DependentQuestionnaireValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/DependentQuestionnaire";

import DirectDepositInformation, {
  type DirectDepositValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/DirectDepositInformation";

import EducationCreditsAndDeductions, {
  type EducationCreditsAndDeductionsValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/EducationCreditsAndDeductions";

import HeadOfHouseholdDocumentation, {
  type HeadOfHouseholdDocumentationValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/HeadOfHouseholdDocumentation";

import IdentificationForTaxpayerAndSpouse, {
  type IdentificationForTaxpayerAndSpouseValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/IdentificationForTaxpayerAndSpouse";

import EstimatedFederalTaxPayments, {
  type EstimatedFederalTaxPaymentsValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/EstimatedFederalTaxPayments";

import EstimatedStateTaxPayments, {
  type EstimatedStateTaxPaymentsValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/EstimatedStateTaxPayments";

import IncomeDocumentationAssistance, {
  type IncomeDocumentationAssistanceValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/IncomeDocumentationAssistance";

import QualifyingChildAssistance, {
  type QualifyingChildAssistanceValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/QualifyingChildAssistance";

import ForeignAccountAndDigitalAssets, {
  type ForeignAccountAndDigitalAssetsValues,
} from "@/app/(client)/(protected)/(app)/questionnaire/_components/ForeignAccountAndDigitalAssets";

export type QuestionnaireStepId =
  | "IDENTIFICATION"
  | "INCOME"
  | "DEPENDENTS"
  | "QUALIFYING_CHILD"
  | "HEAD_OF_HOUSEHOLD"
  | "EDUCATION"
  | "ESTIMATED_FEDERAL"
  | "ESTIMATED_STATE"
  | "DIRECT_DEPOSIT"
  | "FOREIGN_DIGITAL";

export type QuestionnaireValuesMap = {
  IDENTIFICATION: IdentificationForTaxpayerAndSpouseValues;
  INCOME: IncomeDocumentationAssistanceValues;
  DEPENDENTS: DependentQuestionnaireValues;
  QUALIFYING_CHILD: QualifyingChildAssistanceValues;
  HEAD_OF_HOUSEHOLD: HeadOfHouseholdDocumentationValues;
  EDUCATION: EducationCreditsAndDeductionsValues;
  ESTIMATED_FEDERAL: EstimatedFederalTaxPaymentsValues;
  ESTIMATED_STATE: EstimatedStateTaxPaymentsValues;
  DIRECT_DEPOSIT: DirectDepositValues;
  FOREIGN_DIGITAL: ForeignAccountAndDigitalAssetsValues;
};

export type QuestionnaireStepConfig = {
  id: QuestionnaireStepId;
  label: string;
  description: string;
  href: string; // used by dashboard “Next steps”
  Component: React.ComponentType<any>;
};

export const QUESTIONNAIRE_FLOW: QuestionnaireStepConfig[] = [
  {
    id: "IDENTIFICATION",
    label: "Identification",
    description: "Taxpayer/spouse ID details to verify identity.",
    href: "/questionnaire?step=IDENTIFICATION",
    Component: IdentificationForTaxpayerAndSpouse,
  },
  {
    id: "INCOME",
    label: "Income documentation",
    description: "W-2s, 1099s, and income details we need.",
    href: "/questionnaire?step=INCOME",
    Component: IncomeDocumentationAssistance,
  },
  {
    id: "DEPENDENTS",
    label: "Dependents",
    description: "Add dependents and household details.",
    href: "/questionnaire?step=DEPENDENTS",
    Component: DependentQuestionnaire,
  },
  {
    id: "QUALIFYING_CHILD",
    label: "Qualifying child",
    description: "Child-related credits and qualification details.",
    href: "/questionnaire?step=QUALIFYING_CHILD",
    Component: QualifyingChildAssistance,
  },
  {
    id: "HEAD_OF_HOUSEHOLD",
    label: "Head of household",
    description: "Documentation if filing HOH.",
    href: "/questionnaire?step=HEAD_OF_HOUSEHOLD",
    Component: HeadOfHouseholdDocumentation,
  },
  {
    id: "EDUCATION",
    label: "Education credits",
    description: "1098-T, tuition, and education deductions/credits.",
    href: "/questionnaire?step=EDUCATION",
    Component: EducationCreditsAndDeductions,
  },
  {
    id: "ESTIMATED_FEDERAL",
    label: "Estimated federal taxes",
    description: "Any quarterly/estimated federal payments.",
    href: "/questionnaire?step=ESTIMATED_FEDERAL",
    Component: EstimatedFederalTaxPayments,
  },
  {
    id: "ESTIMATED_STATE",
    label: "Estimated state taxes",
    description: "Any quarterly/estimated state payments.",
    href: "/questionnaire?step=ESTIMATED_STATE",
    Component: EstimatedStateTaxPayments,
  },
  {
    id: "DIRECT_DEPOSIT",
    label: "Direct deposit",
    description: "Bank information for refund direct deposit.",
    href: "/questionnaire?step=DIRECT_DEPOSIT",
    Component: DirectDepositInformation,
  },
  {
    id: "FOREIGN_DIGITAL",
    label: "Foreign & digital assets",
    description: "Foreign accounts and digital asset questions.",
    href: "/questionnaire?step=FOREIGN_DIGITAL",
    Component: ForeignAccountAndDigitalAssets,
  },
];

export const QUESTIONNAIRE_FIRST_STEP = QUESTIONNAIRE_FLOW[0];
