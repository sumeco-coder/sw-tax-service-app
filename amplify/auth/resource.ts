import { defineAuth } from "@aws-amplify/backend";
import { assignRoleOnConfirm } from "../functions/assignRoleOnConfirm/resource";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  // All the groups you plan to use
  groups: ["admin", "lms-admin", "lms-preparer", "taxpayer"],

  // ✅ Add custom attributes to the User Pool schema
  userAttributes: {
    "custom:role": {
      dataType: "String",
      mutable: true,
      minLen: 1,
      maxLen: 32,
    },
    "custom:agencyId": {
      dataType: "String",
      mutable: true,
      minLen: 1,
      maxLen: 64,
    },
  },

  // ✅ Give the postConfirmation Lambda permission to update users + groups
  access: (allow) => [
    allow.resource(assignRoleOnConfirm).to([
      "manageUsers",
      "manageGroupMembership",
    ]),
  ],

  triggers: {
    postConfirmation: assignRoleOnConfirm,
  },
});
