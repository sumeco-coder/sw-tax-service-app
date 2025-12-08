// types/dashboard.ts

// ===============================
// Dashboard Shared Types
// ===============================

// ----------- Documents -----------
export type Doc = {
  id: string;
  displayName?: string;
  docType?: string;
  taxYear?: number | string | null;
  url?: string;
};

// ----------- Tasks -----------
export type Task = {
  id: string;
  title: string;
  detail?: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING" | "DONE" | "CANCELLED";
  taxReturnId?: string | null;
  createdAt?: string;
};

// ----------- Invoices -----------
export type Invoice = {
  id: string;
  amount: number;
  status: "PAID" | "UNPAID" | "VOID";
  issuedAt?: string;
};

// ----------- Messages -----------
export type Message = {
  id: string;
  body: string;
  sender: "user" | "staff";
  createdAt?: string | Date;
};


// ----------- Appointment -----------
export type Appointment = {
  id: string;
  type: "PHONE" | "VIDEO" | "IN_PERSON";
  status: "CONFIRMED" | "PENDING" | "RESCHEDULE_REQUESTED" | "CANCELLED";
  start: string; // ISO date
  end?: string | null;
  location?: string;
};

// ----------- Onboarding Step -----------
export type OnboardingStep =
  | "PROFILE"
  | "DOCS"
  | "TAXPAYER_INFO"
  | "DOCUMENTS"
  | "REVIEW"
  | "SCHEDULE"
  | "SUBMITTED"
  | "DONE";

// ----------- Return Status -----------
export type ReturnStatus = {
  status: "DRAFT" | "IN_REVIEW" | "FILED" | "ACCEPTED" | "REJECTED" | "AMENDED";

  refundAmount?: number | string | null;
  refundEta?: string | null;
};

// ----------- Year Snapshot (History Section) -----------
export type YearSnapshot = {
  taxYear: number;
  net: number | null; // positive = refund, negative = owe
  status: ReturnStatus["status"];
};
