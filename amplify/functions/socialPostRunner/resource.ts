// amplify/functions/socialPostRunner/resource.ts
import { defineFunction, secret } from "@aws-amplify/backend";

export const socialPostRunner = defineFunction({
  name: "socialPostRunner",
  entry: "./handler.ts",
  schedule: "every 5m",
  environment: {
    DATABASE_URL: secret("DATABASE_URL"),

    // ✅ base domain for building absolute links (set to https://swtaxservice.com)
    APP_ORIGIN: secret("APP_ORIGIN"),

    // ✅ backward-compatible alias (if your handler currently expects APP_URL)
    APP_URL: secret("APP_ORIGIN"),

    X_USER_TOKEN: secret("X_USER_TOKEN"),

    META_PAGE_ID: secret("META_PAGE_ID"),
    META_PAGE_TOKEN: secret("META_PAGE_TOKEN"),

    IG_USER_ID: secret("IG_USER_ID"),
    IG_TOKEN: secret("IG_TOKEN"),

    META_GRAPH_VERSION: secret("META_GRAPH_VERSION"),
  },
});
