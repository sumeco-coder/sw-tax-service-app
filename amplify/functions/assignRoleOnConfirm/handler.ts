// amplify/functions/assignRoleOnConfirm/handler.ts
import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// ✅ Amplify Gen 2 typed env (keys must be declared in resource.ts -> environment)
import { env } from "$amplify/env/assignRoleOnConfirm";

const cognito = new CognitoIdentityProviderClient({});

// Roles we support
const VALID_ROLES = ["taxpayer", "lms-preparer", "lms-admin", "admin"] as const;
type AllowedRole = (typeof VALID_ROLES)[number];

function parseEmailList(csv: string) {
  return new Set(
    csv
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function roleToGroup(role: AllowedRole) {
  // In your project, group names match role strings
  return role;
}

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const userPoolId = event.userPoolId;
  const username = event.userName;

  const clientMetadata = event.request.clientMetadata ?? {};
  const attrs = event.request.userAttributes ?? {};

  const email = safeTrim(attrs.email).toLowerCase();
  const inviteCode = safeTrim(clientMetadata.inviteCode);

  // From Amplify environment/secrets
  const ADMIN_EMAILS = parseEmailList(safeTrim(env.ADMIN_EMAILS));
  const CODE_PREPARER = safeTrim(env.INVITE_CODE_LMS_PREPARER);
  const CODE_LMS_ADMIN = safeTrim(env.INVITE_CODE_LMS_ADMIN);

  // ✅ SECURITY POLICY:
  // - Default: taxpayer
  // - Admin: allow-listed email only
  // - Staff roles: inviteCode only (NOT clientMetadata.role)
  let desiredRole: AllowedRole = "taxpayer";

  if (email && ADMIN_EMAILS.has(email)) {
    desiredRole = "admin";
  } else if (inviteCode && CODE_PREPARER && inviteCode === CODE_PREPARER) {
    desiredRole = "lms-preparer";
  } else if (inviteCode && CODE_LMS_ADMIN && inviteCode === CODE_LMS_ADMIN) {
    desiredRole = "lms-admin";
  } else {
    desiredRole = "taxpayer";
  }

  if (!VALID_ROLES.includes(desiredRole)) {
    desiredRole = "taxpayer";
  }

  const groupName = roleToGroup(desiredRole);

  // 1) Add user to group
  try {
    await cognito.send(
      new AdminAddUserToGroupCommand({
        GroupName: groupName,
        Username: username,
        UserPoolId: userPoolId,
      })
    );
    console.log(`✅ Added user ${username} to group ${groupName}`);
  } catch (err) {
    console.error("❌ Error adding user to group", err);
  }

  // 2) Sync custom:role attribute (so your app can read it)
  try {
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: [{ Name: "custom:role", Value: desiredRole }],
      })
    );
    console.log(`✅ Set custom:role=${desiredRole} for ${username}`);
  } catch (err) {
    console.error("❌ Error updating custom:role", err);
  }

  return event;
};
