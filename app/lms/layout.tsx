// app/lms/(lms)/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import LmsShell from "./(lms)/_components/LmsShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LmsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LmsShell>{children}</LmsShell>
    </Suspense>
  );
}