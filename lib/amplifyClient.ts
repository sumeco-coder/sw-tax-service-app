// lib/amplifyClient.ts
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json"; // path from project root

let configured = false;
export function configureAmplify() {
  if (!configured) {
    Amplify.configure(outputs);
    configured = true;
  }
}
