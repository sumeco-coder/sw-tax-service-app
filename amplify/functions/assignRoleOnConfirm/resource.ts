// amplify/functions/assignRoleOnConfirm/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const assignRoleOnConfirm = defineFunction({
  name: "assignRoleOnConfirm",
  entry: "./handler.ts",
  timeoutSeconds: 10,
});
