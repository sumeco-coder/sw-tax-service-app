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
  groups: ["admin", "lms-admin", "lms-preparer", "taxpayer"],           // optional, for future admin-only pages
  // No identityPool config here — it's automatic when public rules exist

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

    // OPTIONAL (only include if your app already uses these)
    // "custom:onboardingComplete": { dataType: "Boolean", mutable: true },
    // "custom:goal": { dataType: "String", mutable: true, maxLen: 64 },
  },
   triggers: {
    postConfirmation: assignRoleOnConfirm,
  },
});
