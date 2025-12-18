import { defineFunction, secret } from "@aws-amplify/backend";

export const emailCampaignRunner = defineFunction({
  name: "emailCampaignRunner",

  // ✅ optional: schedule it to run automatically
  // If you don’t want auto, delete this line.
  schedule: "every 5m",

  environment: {
    DATABASE_URL: secret("DATABASE_URL"),
    RESEND_API_KEY: secret("RESEND_API_KEY"),

    // optional (non-secret)
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "SW Tax Service <no-reply@swtaxservice.com>",
    SITE_URL: process.env.SITE_URL ?? "https://www.swtaxservice.com",
  },
});
