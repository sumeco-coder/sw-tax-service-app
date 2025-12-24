// lib/amplifyClient.ts
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

let configured = false;

export function configureAmplify() {
  if (configured) return;

  Amplify.configure(outputs, {
    ssr: true, // ✅ recommended for Next.js (prevents some hydration/env issues)
  });

  configured = true;
}
