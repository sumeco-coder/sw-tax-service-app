// app/(auth)/sign-up/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import SignInClient from "./SignInClient";

export const metadata: Metadata = {
  title: "Complete Your Tax Onboarding | SW Tax Service",
  description:
    "Create your SW Tax Service client portal account to start your tax onboarding.",
};

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInClient />
    </Suspense>
  );
}


