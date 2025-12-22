import { defineFunction, secret } from "@aws-amplify/backend";

export const emailCampaignRunner = defineFunction({
  name: "emailCampaignRunner",

  // cheapest: fewer invocations
  schedule: "every 5m",

  environment: {
    DATABASE_URL: secret("DATABASE_URL"),
    RESEND_API_KEY: secret("RESEND_API_KEY"),

    RESEND_FROM_EMAIL: "SW Tax Service <no-reply@swtaxservice.com>",
    SITE_URL: "https://www.swtaxservice.com",

    EMAIL_SEND_BATCH_SIZE: "50",
    EMAIL_RUNNER_MAX_MS: String(10 * 60 * 1000),

    // still useful for crash recovery
    EMAIL_STALE_SENDING_MINUTES: "30",

    // ❌ remove these (only needed for continuation)
    // EMAIL_CONTINUATION_DELAY_MS: "60000",
    // EMAIL_CAMPAIGN_RUNNER_LAMBDA_ARN: secret("EMAIL_CAMPAIGN_RUNNER_LAMBDA_ARN"),
    // SCHEDULER_INVOKE_ROLE_ARN: secret("SCHEDULER_INVOKE_ROLE_ARN"),
  },
});
