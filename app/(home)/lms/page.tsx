import type { Metadata } from "next";
import { LmsForTaxProsClient } from "./LmsForTaxProsClient";

export const metadata: Metadata = {
  title: "LMS for Tax Pros • SW Tax Service",
  description:
    "Level up your tax practice with our LMS: step-by-step courses, SOPs, checklists, and templates designed for modern tax professionals.",
};

export default function Page() {
  return <LmsForTaxProsClient />;
}

