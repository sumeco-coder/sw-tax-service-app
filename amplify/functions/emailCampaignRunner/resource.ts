// amplify/functions/emailCampaignRunner/resource.ts
import { defineFunction, secret } from "@aws-amplify/backend";

export const emailCampaignRunner = defineFunction({
  name: "emailCampaignRunner",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  environment: {
    RESEND_API_KEY: secret("RESEND_API_KEY"),
    RESEND_FROM: secret("RESEND_FROM"),
    APP_ORIGIN: secret("APP_ORIGIN"),
  },
});
