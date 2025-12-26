// amplify/functions/assignRoleOnConfirm/handler.ts
import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({});

const ROLES = ["taxpayer", "lms-preparer", "lms-admin", "admin", "unknown"] as const;
type AnyRole = (typeof ROLES)[number];
type GroupRole = Exclude<AnyRole, "unknown">;

function normalizeEmail(s: unknown) {
  return String(s ?? "").trim().toLowerCase();
}

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function parseEmailList(csv: string) {
  return new Set(
    (csv ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function decideRole(opts: {
  email: string;
  inviteCode: string;
  adminEmails: Set<string>;
  adminInviteCode: string;
  lmsAdminInviteCode: string;
  preparerInviteCode: string;
}): GroupRole {
  const {
    email,
    inviteCode,
    adminEmails,
    adminInviteCode,
    lmsAdminInviteCode,
    preparerInviteCode,
  } = opts;

  // ✅ Admin requires BOTH allowlist email + admin invite code
  const isAdminByPolicy =
    !!email &&
    adminEmails.has(email) &&
    !!adminInviteCode &&
    inviteCode === adminInviteCode;

  if (isAdminByPolicy) return "admin";
  if (inviteCode && lmsAdminInviteCode && inviteCode === lmsAdminInviteCode) return "lms-admin";
  if (inviteCode && preparerInviteCode && inviteCode === preparerInviteCode) return "lms-preparer";

  return "taxpayer";
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

  // What your signup page passes: options.clientMetadata.inviteCode
  const inviteCode = safeTrim(clientMetadata.inviteCode);

  // Secrets / env (Amplify injects these)
  const adminEmails = parseEmailList(safeTrim(process.env.ADMIN_EMAILS));
  const adminInviteCode = safeTrim(process.env.ADMIN_INVITE_CODE);
  const lmsAdminInviteCode = safeTrim(process.env.INVITE_CODE_LMS_ADMIN);
  const preparerInviteCode = safeTrim(process.env.INVITE_CODE_LMS_PREPARER);

  // We support AnyRole in types, but actual assignment is always a real group role.
  const desiredGroupRole: GroupRole = decideRole({
    email,
    inviteCode,
    adminEmails,
    adminInviteCode,
    lmsAdminInviteCode,
    preparerInviteCode,
  });

  // If you still want a "desiredRole" variable that can be "unknown" elsewhere:
  const desiredRole: AnyRole = desiredGroupRole; // never "unknown" here

  // 1) Add user to group (never "unknown")
  try {
    await cognito.send(
      new AdminAddUserToGroupCommand({
        GroupName: desiredGroupRole,
        Username: username,
        UserPoolId: userPoolId,
      })
    );
    console.log(`✅ Added user ${username} to group ${desiredGroupRole}`);
  } catch (err) {
    console.error("❌ Error adding user to group", err);
  }

  // 2) Sync custom:role attribute
  try {
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: [{ Name: "custom:role", Value: desiredGroupRole }],
      })
    );
    console.log(`✅ Set custom:role=${desiredGroupRole} for ${username}`);
  } catch (err) {
    console.error("❌ Error updating custom:role", err);
  }

  return event;
};
