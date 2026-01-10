// app/(admin)/admin/(auth)/sign-in/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import SignInAdmin from "../_components/SignInAdmin";

export const metadata: Metadata = {
  title: "Admin Sign In | SW Tax Service",
  description: "Admin access only.",
};

export const dynamic = "force-dynamic";

export default function AdminSignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInAdmin />
    </Suspense>
  );
}
