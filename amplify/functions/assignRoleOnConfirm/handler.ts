// amplify/functions/assignRoleOnConfirm/handler.ts
import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// In Lambda, region is automatically available via AWS_REGION.
// Keeping {} is fine, but explicitly setting region is also OK.
// const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const cognito = new CognitoIdentityProviderClient({});

const ROLES = ["taxpayer", "lms-preparer", "lms-admin", "admin", "unknown"] as const;
type AnyRole = (typeof ROLES)[number];
type GroupRole = Exclude<AnyRole, "unknown">;

const GROUP_ROLES = new Set<GroupRole>(["taxpayer", "lms-preparer", "lms-admin", "admin"]);

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

/**
 * Accepts values like:
 * - "taxpayer"
 * - "TAXPAYER"
 * - "lms-preparer"
 * - "LMS_PREPARER"
 * - "lms_preparer"
 * and normalizes to a GroupRole if possible.
 */
function normalizeRoleValue(v: unknown): GroupRole | null {
  const raw = safeTrim(v);
  if (!raw) return null;

  let r = raw.toLowerCase();

  // normalize common separators
  r = r.replace(/_/g, "-");

  // map your uppercase enum values (from admin tooling) to group-style names
  if (r === "taxpayer") return "taxpayer";
  if (r === "lms-preparer") return "lms-preparer";
  if (r === "lms-admin") return "lms-admin";
  if (r === "admin") return "admin";

  return null;
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

  // ✅ If admin/invite tooling already set custom:role, honor it
  const presetRole = normalizeRoleValue(attrs["custom:role"]);

  const desiredGroupRole: GroupRole =
    presetRole ??
    decideRole({
      email,
      inviteCode,
      adminEmails,
      adminInviteCode,
      lmsAdminInviteCode,
      preparerInviteCode,
    });

  // If you still want a "desiredRole" variable that can be "unknown" elsewhere:
  const desiredRole: AnyRole = desiredGroupRole;

  // 1) Add user to group (never "unknown")
  try {
    if (GROUP_ROLES.has(desiredGroupRole)) {
      await cognito.send(
        new AdminAddUserToGroupCommand({
          GroupName: desiredGroupRole,
          Username: username,
          UserPoolId: userPoolId,
        })
      );
      console.log(`✅ Added user ${username} to group ${desiredGroupRole}`);
    }
  } catch (err) {
    console.error("❌ Error adding user to group", err);
  }

  // 2) Sync custom:role attribute (keep it consistent with group)
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
