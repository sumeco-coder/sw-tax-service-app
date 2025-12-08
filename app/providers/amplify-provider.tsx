"use client";

import { configureAmplify } from "@/lib/amplifyClient";

// Run Amplify config once globally
configureAmplify();

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
