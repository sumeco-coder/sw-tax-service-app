import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const env = process.env;

const cognito = new CognitoIdentityProviderClient({});

const VALID_ROLES = ["taxpayer", "lms-preparer", "lms-admin", "admin"] as const;
type AllowedRole = (typeof VALID_ROLES)[number];

function normalizeEmail(s: unknown) {
  return String(s ?? "").trim().toLowerCase();
}

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function parseEmailList(csv: string) {
  return new Set(
    csv
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const userPoolId = event.userPoolId;
  const username = event.userName;
  const clientMetadata = event.request.clientMetadata ?? {};
  const attrs = event.request.userAttributes ?? {};

  const email =
    normalizeEmail(attrs.email) ||
    normalizeEmail(attrs["preferred_username"]) ||
    normalizeEmail(attrs["cognito:username"]);

  // What your signup pages pass (admin sign-up will pass this)
  const inviteCode = safeTrim(clientMetadata.inviteCode);

  // Secrets / env
  const ADMIN_EMAILS = parseEmailList(safeTrim(env.ADMIN_EMAILS));
  const ADMIN_INVITE_CODE = safeTrim(env.ADMIN_INVITE_CODE);

  const CODE_PREPARER = safeTrim(env.INVITE_CODE_LMS_PREPARER);
  const CODE_LMS_ADMIN = safeTrim(env.INVITE_CODE_LMS_ADMIN);

  let desiredRole: AllowedRole = "taxpayer";

  // ✅ Admin requires BOTH allowlist email + admin invite code
  const isAdminByPolicy =
    !!email &&
    ADMIN_EMAILS.has(email) &&
    !!ADMIN_INVITE_CODE &&
    inviteCode === ADMIN_INVITE_CODE;

  if (isAdminByPolicy) {
    desiredRole = "admin";
  } else if (inviteCode && CODE_LMS_ADMIN && inviteCode === CODE_LMS_ADMIN) {
    desiredRole = "lms-admin";
  } else if (inviteCode && CODE_PREPARER && inviteCode === CODE_PREPARER) {
    desiredRole = "lms-preparer";
  } else {
    desiredRole = "taxpayer";
  }

  if (!VALID_ROLES.includes(desiredRole)) desiredRole = "taxpayer";

  const groupName = desiredRole; // group names match role strings in your app

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

  // 2) Sync custom:role attribute
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
