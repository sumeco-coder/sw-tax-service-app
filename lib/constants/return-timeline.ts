import type { ReturnStatus } from "@/types/dashboard";


export const RETURN_TIMELINE_STAGES: Array<{
  id: string;
  label: string;
  helper: string;
  matches: ReturnStatus["status"][];
}> = [
  {
    id: "INFO_RECEIVED",
    label: "Info received",
    helper: "We’ve received your information and documents.",
    matches: ["DRAFT"],
  },
  {
    id: "PREPARATION",
    label: "In preparation",
    helper: "We’re organizing your info and preparing the return.",
    matches: [], // implied between DRAFT and IN_REVIEW
  },
  {
    id: "IN_REVIEW",
    label: "In review",
    helper: "We’re reviewing your return and checking for accuracy.",
    matches: ["IN_REVIEW"],
  },
  {
    id: "EFILED",
    label: "E-filed",
    helper: "Your return has been submitted to the IRS/state.",
    matches: ["FILED"],
  },
  {
    id: "FINAL",
    label: "Accepted / Rejected",
    helper: "We’ve received a final response from the IRS/state.",
    matches: ["ACCEPTED", "REJECTED"],
  },
  {
    id: "AMENDED",
    label: "Amended",
    helper: "We’ve filed an amended return to correct/update your original.",
    matches: ["AMENDED"],
  },
];
