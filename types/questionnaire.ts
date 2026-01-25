// app/(client)/(protected)/(app)/questionnaire/types.ts

export type SerializableDate = Date | string | null;

export type QuestionnairePrefill = {
  userId: string;

  directDeposit: {
    useDirectDeposit: boolean;
    accountHolderName: string;
    bankName: string;
    accountType: "checking" | "savings";
    routingLast4: string;
    accountLast4: string;
    updatedAt: SerializableDate;
  } | null;

  educationCredits: any | null;
  headOfHouseholdDocs: any | null;

  identification: {
    taxpayer: any | null;
    spouse: any | null;
  };

  estimatedTaxPayments: any | null;
  estimatedStateTaxPayments: any | null;
  incomeDocumentation: any | null;
  qualifyingChildren: any | null;
  foreignAccountsDigitalAssets: any | null;

  dependents: Array<{
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    dob: string | Date | null;
    relationship: string;
    monthsInHome: number;
    isStudent: boolean;
    isDisabled: boolean;
    appliedButNotReceived: boolean;
    updatedAt: SerializableDate;
    questionnaire: any | null; // saved dependentQuestionnaires.payload
  }>;
};
