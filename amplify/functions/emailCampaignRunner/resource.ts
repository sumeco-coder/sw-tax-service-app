// amplify/functions/emailCampaignRunner/resource.ts
import { defineFunction, secret } from "@aws-amplify/backend";

export const emailCampaignRunner = defineFunction({
  name: "emailCampaignRunner",
  schedule: "every 5m",
  environment: {
    DATABASE_URL: secret("DATABASE_URL"),
    RESEND_API_KEY: secret("RESEND_API_KEY"),

    // non-secret strings are fine inline
    RESEND_FROM_EMAIL: "SW Tax Service <no-reply@swtaxservice.com>",
    SITE_URL: "https://www.swtaxservice.com",

    // optional knobs (only keep if your handler reads them)
    EMAIL_SEND_BATCH_SIZE: "50",
    EMAIL_RUNNER_MAX_MS: String(10 * 60 * 1000),
  },
});
