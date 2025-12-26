// amplify/functions/assignRoleOnConfirm/resource.ts
import { defineFunction, secret } from "@aws-amplify/backend";

export const assignRoleOnConfirm = defineFunction({
  name: "assignRoleOnConfirm",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  environment: {
    DATABASE_URL: secret("DATABASE_URL"),
    ADMIN_EMAILS: secret("ADMIN_EMAILS"),
    ADMIN_INVITE_CODE: secret("ADMIN_INVITE_CODE"),
    INVITE_CODE_LMS_PREPARER: secret("INVITE_CODE_LMS_PREPARER"),
    INVITE_CODE_LMS_ADMIN: secret("INVITE_CODE_LMS_ADMIN"),
  },
});
