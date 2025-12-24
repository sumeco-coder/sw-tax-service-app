import { defineFunction, secret } from "@aws-amplify/backend";
import { Duration } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const emailCampaignRunnerV2 = defineFunction((scope) => {
  // ✅ Build as CommonJS -> produces index.js (not index.mjs)
  const fn = new NodejsFunction(scope, "emailCampaignRunnerV2Fn", {
    runtime: Runtime.NODEJS_20_X,
    entry: path.join(__dirname, "handler.ts"),
    handler: "handler",
    timeout: Duration.minutes(10),
    memorySize: 1024,

    bundling: {
      minify: false,
      format: OutputFormat.CJS, // ✅ KEY FIX
      nodeModules: ["pg"],      // ✅ make sure pg is included correctly
    },

    environment: {
      DATABASE_URL: secret("DATABASE_URL").toString(),
      RESEND_API_KEY: secret("RESEND_API_KEY").toString(),
      RESEND_FROM_EMAIL: "SW Tax Service <no-reply@swtaxservice.com>",
      SITE_URL: "https://www.swtaxservice.com",
      EMAIL_SEND_BATCH_SIZE: "50",
      EMAIL_RUNNER_MAX_MS: String(10 * 60 * 1000),
      EMAIL_STALE_SENDING_MINUTES: "30",
      // EMAIL_PROVIDER: "resend", // optional
    },
  });

  // ✅ Custom functions can't use schedule:"every 5m" directly,
  // so we attach EventBridge schedule ourselves.
  new Rule(scope, "emailCampaignRunnerV2Schedule", {
    schedule: Schedule.rate(Duration.minutes(5)),
    targets: [new LambdaFunction(fn)],
  });

  return fn;
});
