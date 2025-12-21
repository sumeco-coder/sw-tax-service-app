// app/(admin)/admin/(protected)/email/layout.tsx
import type { ReactNode } from "react";
import EmailSubnav from "./_components/email-subnav";

export default function EmailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <EmailSubnav />
      <div>{children}</div>
    </div>
  );
}
