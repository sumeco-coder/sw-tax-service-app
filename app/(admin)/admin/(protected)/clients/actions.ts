"use server";

import { z } from "zod";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrRedirect, revalidateClientPaths } from "./_helpers";
import { redirect } from "next/navigation";

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { sendPortalInviteEmail } from "@/lib/email/sendPortalInvite";

const CreateClientSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  role: z.string().optional(),
  agencyId: z.string().optional(),

  // ✅ choose invite method
  inviteMode: z.enum(["cognito", "branded"]).optional(),
});

const StatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "disabled"]),
  reason: z.string().max(500).optional(),
});

const ProfileSchema = z.object({
  userId: z.string().min(1),
  name: z.string().max(120).optional(),
  adminNotes: z.string().max(2000).optional(),
});

function getAttr(
  attrs: { Name?: string; Value?: string }[] | undefined,
  name: string
) {
  return attrs?.find((a) => a.Name === name)?.Value ?? null;
}

export async function adminCreateClientUser(formData: FormData) {
  await requireAdminOrRedirect();

  const parsed = CreateClientSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    firstName: String(formData.get("firstName") ?? "").trim() || undefined,
    lastName: String(formData.get("lastName") ?? "").trim() || undefined,
    role: String(formData.get("role") ?? "").trim() || undefined,
    agencyId: String(formData.get("agencyId") ?? "").trim() || undefined,
    inviteMode: (String(formData.get("inviteMode") ?? "").trim() as any) || undefined,
  });

  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const { email, phone, firstName, lastName, role, agencyId } = parsed.data;
  const inviteMode = parsed.data.inviteMode ?? "branded"; // ✅ default to branded

  const region = process.env.AWS_REGION!;
  const userPoolId = process.env.COGNITO_USER_POOL_ID!;
  if (!region || !userPoolId) {
    return { ok: false, error: "Missing AWS_REGION or COGNITO_USER_POOL_ID." };
  }

  const finalRole = (role ?? "client").trim() || "client";
  const client = new CognitoIdentityProviderClient({ region });

  // 1) Create user in Cognito
  // - cognito mode: Cognito sends temp password invite
  // - branded mode: SUPPRESS Cognito email, we send via Resend
  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        DesiredDeliveryMediums: inviteMode === "cognito" ? ["EMAIL"] : undefined,
        MessageAction: inviteMode === "branded" ? "SUPPRESS" : undefined,
        UserAttributes: [
          { Name: "email", Value: email },

          // ✅ key for branded flow: allow password recovery emails
          ...(inviteMode === "branded" ? [{ Name: "email_verified", Value: "true" }] : []),

          ...(phone ? [{ Name: "phone_number", Value: phone }] : []),
          { Name: "custom:role", Value: finalRole },
          ...(agencyId ? [{ Name: "custom:agencyId", Value: agencyId }] : []),
        ],
      })
    );
  } catch (e: any) {
    if (e?.name !== "UsernameExistsException") {
      return { ok: false, error: e?.message ?? "Failed to create Cognito user." };
    }
  }

  // 2) Fetch user attributes to get sub
  const res = await client.send(
    new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    })
  );

  const sub = getAttr(res.UserAttributes, "sub");
  if (!sub) return { ok: false, error: "Could not read Cognito sub." };

  // 3) Upsert DB user row
  const [row] = await db
    .insert(users)
    .values({
      cognitoSub: sub,
      email,
      phone: phone ?? null,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      filingClient: true,
    })
    .onConflictDoUpdate({
      target: users.cognitoSub,
      set: {
        email,
        phone: phone ?? null,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  revalidateClientPaths(String(row.id));

  // 4) If branded mode, send your Resend email
  if (inviteMode === "branded") {
    await sendPortalInviteEmail({
      to: email,
      firstName,
      appUrl: process.env.APP_URL,
    });
  }

  return {
    ok: true,
    userId: String(row.id),
    cognitoSub: sub,
    inviteMode,
  };
}

export async function adminCreateClientAndRedirect(formData: FormData) {
  await requireAdminOrRedirect();

  const res = await adminCreateClientUser(formData);
  if (!res?.ok || !res.userId) return;

  redirect(`/admin/clients/${res.userId}`);
}

export async function adminResendClientInvite(email: string) {
  await requireAdminOrRedirect();

  const region = process.env.AWS_REGION!;
  const userPoolId = process.env.COGNITO_USER_POOL_ID!;
  const client = new CognitoIdentityProviderClient({ region });

  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      MessageAction: "RESEND",
    })
  );

  return { ok: true };
}

export async function setClientStatus(formData: FormData) {
  await requireAdminOrRedirect();

  const parsed = StatusSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    status: String(formData.get("status") ?? ""),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  });
  if (!parsed.success) return;

  const { userId, status, reason } = parsed.data;

  await db
    .update(users)
    .set({
      status,
      disabledAt: status === "disabled" ? new Date() : null,
      disabledReason: status === "disabled" ? (reason ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidateClientPaths(userId);
}

export async function updateClientProfile(formData: FormData) {
  await requireAdminOrRedirect();

  const parsed = ProfileSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    name: String(formData.get("name") ?? "").trim() || undefined,
    adminNotes: String(formData.get("adminNotes") ?? "").trim() || undefined,
  });
  if (!parsed.success) return;

  const { userId, name, adminNotes } = parsed.data;

  await db
    .update(users)
    .set({
      name: name ?? null,
      adminNotes: adminNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidateClientPaths(userId);
}
