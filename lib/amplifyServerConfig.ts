// lib/amplifyServerConfig.ts
import outputs from "@/amplify_outputs.json";
import type { ResourcesConfig } from "aws-amplify";

// Relax typing on outputs so TS doesn't complain about extra fields like login_with
const auth = (outputs as any).auth;
const storage = (outputs as any).storage;

/**
 * Minimal ResourcesConfig for server-side Amplify Auth + Storage.
 * LMS uses Drizzle/Postgres, so we don't need Amplify Data here.
 */
export const amplifyServerConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: auth.user_pool_id,
      userPoolClientId: auth.user_pool_client_id,
      identityPoolId: auth.identity_pool_id,
      loginWith: auth.login_with,
      groups: auth.groups ?? [],
    },
  },

  Storage: {
    S3: {
      bucket: storage?.bucket_name,
      region: storage?.aws_region,
    },
  },
};
