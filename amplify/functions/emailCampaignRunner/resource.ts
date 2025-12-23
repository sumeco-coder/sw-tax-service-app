// amplify/functions/emailCampaignRunner/resource.ts
import { defineFunction, secret } from "@aws-amplify/backend";

export const emailCampaignRunner = defineFunction({
  name: "emailCampaignRunner",
  entry: "./handler.ts",

  // runs on a schedule (Amplify creates the EventBridge schedule for you)
  schedule: "every 5m",

  // ✅ the ONLY bundling option Amplify exposes today
  bundling: { minify: false },

  environment: {
    DATABASE_URL: secret("DATABASE_URL"),
    RESEND_API_KEY: secret("RESEND_API_KEY"),
    RESEND_FROM_EMAIL: "SW Tax Service <no-reply@swtaxservice.com>",
    SITE_URL: "https://www.swtaxservice.com",
    EMAIL_SEND_BATCH_SIZE: "50",
    EMAIL_RUNNER_MAX_MS: String(10 * 60 * 1000),
    EMAIL_STALE_SENDING_MINUTES: "30",
  },
});
