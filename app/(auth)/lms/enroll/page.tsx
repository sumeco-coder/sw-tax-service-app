// app/(auth)/lms/enroll/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import LMSEnrollmentClient from "./LMSEnrollmentClient";

export const metadata: Metadata = {
  title: "LMS Enrollment | SW Tax Service",
  description: "Enroll in the SW Tax Service LMS with your invite link.",
};

export const dynamic = "force-dynamic";

export default function LMSEnrollmentSignUpPage() {
  return (
    <Suspense fallback={null}>
      <LMSEnrollmentClient />
    </Suspense>
  );
}
