import { ReactNode } from "react";
import { TaxKnowledgeTracker } from "@/components/analytics/TaxKnowledgeTracker";

export default function TaxKnowledgeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <TaxKnowledgeTracker />
      <main>{children}</main>
    </>
  );
}
