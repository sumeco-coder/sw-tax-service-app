// lib/amplifyClient.ts
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

let configured = false;

export function configureAmplify() {
  if (configured) return;

  // TEMP DEBUG (remove after verifying live)
  if (typeof window !== "undefined") {
    console.log("amplify_outputs.auth", outputs?.auth);
  }

  Amplify.configure(outputs, { ssr: true });
  configured = true;
}
