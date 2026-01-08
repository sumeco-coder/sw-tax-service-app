// amplify/functions/emailCampaignRunner/resource.ts
import { defineFunction, secret } from "@aws-amplify/backend";

export const emailCampaignRunner = defineFunction({
  name: "emailCampaignRunner",
  schedule: "every 5m",

  timeoutSeconds: 60,
  memoryMB: 1024,

  environment: {
    DATABASE_URL: secret("DATABASE_URL"),
    RESEND_API_KEY: secret("RESEND_API_KEY"),

    RESEND_FROM_EMAIL: "SW Tax Service <no-reply@swtaxservice.com>",
    SITE_URL: "https://www.swtaxservice.com",

    COMPANY_NAME: "SW Tax Service",
    SUPPORT_EMAIL: "support@swtaxservice.com",
    COMPANY_ADDRESS: "Las Vegas, NV",

    INVITE_EXPIRES_DAYS: "14",

    EMAIL_SEND_BATCH_SIZE: "50",
    EMAIL_RUNNER_MAX_MS: String(10 * 60 * 1000),
  },
});
