// amplify/functions/assignRoleOnConfirm/handler.ts
import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({});

// Allowed roles we support
const VALID_ROLES = ["taxpayer", "lms-preparer", "lms-admin", "admin"] as const;
type AllowedRole = (typeof VALID_ROLES)[number];

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const userPoolId = event.userPoolId;
  const username = event.userName;
  const clientMetadata = event.request.clientMetadata ?? {};
  const attrs = event.request.userAttributes ?? {};

  // 1️⃣ Decide what role this user should have
  // Priority: clientMetadata.role → custom:role → default "taxpayer"
  let desiredRole = (clientMetadata.role ||
    attrs["custom:role"] ||
    "taxpayer") as string;

  if (!VALID_ROLES.includes(desiredRole as AllowedRole)) {
    desiredRole = "taxpayer";
  }

  // 2️⃣ Map to Cognito group (same strings for us)
  const groupName =
    desiredRole === "admin"
      ? "admin"
      : desiredRole === "lms-admin"
      ? "lms-admin"
      : desiredRole === "lms-preparer"
      ? "lms-preparer"
      : "taxpayer";

  // 3️⃣ Add user to group
  try {
    await cognito.send(
      new AdminAddUserToGroupCommand({
        GroupName: groupName,
        Username: username,
        UserPoolId: userPoolId,
      })
    );
    console.log(`Added user ${username} to group ${groupName}`);
  } catch (err) {
    console.error("Error adding user to group", err);
  }

  // 4️⃣ (Optional) sync custom:role attribute so your app can read it
  try {
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: [
          {
            Name: "custom:role",
            Value: desiredRole,
          },
        ],
      })
    );
  } catch (err) {
    console.error("Error updating custom:role", err);
  }

  return event;
};
