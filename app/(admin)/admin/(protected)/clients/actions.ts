"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import crypto from "crypto";

import { db } from "@/drizzle/db";
import { users, invites } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

import { requireAdminOrRedirect, revalidateClientPaths } from "./_helpers";

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminResetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { sendPortalInviteEmail } from "@/lib/email/sendPortalInvite";

/* ─────────────────────────────────────────────
   Helpers: origin + invite token + mappings
───────────────────────────────────────────── */

function normalizeBaseUrl(raw: unknown) {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  s = s.replace(/\/+$/, "");
  return s;
}

async function getOriginServer() {
  try {
    // Next 14: headers() is sync, Next 15: async — awaiting is safe either way
     
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").trim();
    if (host) {
      const protoRaw = (h.get("x-forwarded-proto") || "").trim();
      const proto = protoRaw || (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // ignore
  }

  return (
    normalizeBaseUrl(process.env.APP_URL) ||
    normalizeBaseUrl(process.env.APP_ORIGIN) ||
    normalizeBaseUrl(process.env.SITE_URL) ||
    "http://localhost:3000"
  );
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

type UserRole = "TAXPAYER" | "LMS_PREPARER";
type InviteMode = "cognito" | "branded";
type InviteType = "taxpayer" | "lms-preparer";

function roleToInviteType(role: UserRole): InviteType {
  return role === "LMS_PREPARER" ? "lms-preparer" : "taxpayer";
}

function defaultNextForInviteType(type: InviteType) {
  return type === "lms-preparer" ? "/agency" : "/onboarding/profile";
}

function qs(path: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return `${path}${s ? `?${s}` : ""}`;
}

/* ─────────────────────────────────────────────
   Zod schemas
───────────────────────────────────────────── */

const UserRoleSchema = z.enum(["TAXPAYER", "LMS_PREPARER"]);

const CreateClientSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  role: UserRoleSchema.optional(),
  agencyId: z.string().uuid().optional(),
  inviteMode: z.enum(["cognito", "branded"]).optional(),
});

const ResendSchema = z.object({
  email: z.string().email(),
  inviteMode: z.enum(["cognito", "branded"]),
  firstName: z.string().optional(),
  role: UserRoleSchema.optional(),
  agencyId: z.string().uuid().optional(),
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

/* ─────────────────────────────────────────────
   Cognito + Branded invite primitives
───────────────────────────────────────────── */

function cognitoClient() {
  const region = process.env.AWS_REGION!;
  if (!region) throw new Error("Missing AWS_REGION");
  return new CognitoIdentityProviderClient({ region });
}

function userPoolId() {
  const id = process.env.COGNITO_USER_POOL_ID!;
  if (!id) throw new Error("Missing COGNITO_USER_POOL_ID");
  return id;
}

async function ensureCognitoUserAndAttributes(opts: {
  email: string;
  phone?: string;
  role: UserRole;
  agencyId?: string | null;
  branded: boolean; // if true, set email_verified=true
}) {
  const cognito = cognitoClient();
  const pool = userPoolId();

  const attrs = [
    { Name: "email", Value: opts.email },
    ...(opts.branded ? [{ Name: "email_verified", Value: "true" }] : []),
    ...(opts.phone ? [{ Name: "phone_number", Value: opts.phone }] : []),
    { Name: "custom:role", Value: opts.role },
    ...(opts.agencyId ? [{ Name: "custom:agencyId", Value: opts.agencyId }] : []),
  ];

  try {
    // exists?
    await cognito.send(
      new AdminGetUserCommand({ UserPoolId: pool, Username: opts.email })
    );

    // exists -> update attributes
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: pool,
        Username: opts.email,
        UserAttributes: attrs,
      })
    );

    return { existed: true };
  } catch (e: any) {
    // only create if it truly doesn't exist
    if (e?.name !== "UserNotFoundException") {
      throw e;
    }

    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: pool,
        Username: opts.email,
        MessageAction: opts.branded ? "SUPPRESS" : undefined,
        DesiredDeliveryMediums: opts.branded ? undefined : ["EMAIL"],
        UserAttributes: attrs,
      })
    );

    return { existed: false };
  }
}

async function getCognitoSub(email: string) {
  const cognito = cognitoClient();
  const pool = userPoolId();

  const res = await cognito.send(
    new AdminGetUserCommand({ UserPoolId: pool, Username: email })
  );

  const sub = getAttr(res.UserAttributes, "sub");
  if (!sub) throw new Error("Could not read Cognito sub.");
  return sub;
}

async function sendBrandedInviteEmail(opts: {
  email: string;
  firstName?: string;
  phone?: string;
  role: UserRole;
  agencyId?: string | null;
}) {
  // Ensure cognito user exists + correct attributes + email_verified=true
  await ensureCognitoUserAndAttributes({
    email: opts.email,
    phone: opts.phone,
    role: opts.role,
    agencyId: opts.agencyId ?? null,
    branded: true,
  });

  // Create a new DB invite token and email it
  const inviteType = roleToInviteType(opts.role);
  const token = makeToken();

  // revoke old pending invites for this email/type
  await db
    .update(invites)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(
      and(
        eq(invites.email, opts.email),
        eq(invites.type, inviteType),
        eq(invites.status, "pending")
      )
    );

  const expiresAt =
    inviteType === "taxpayer"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : null;

  await db.insert(invites).values({
    email: opts.email,
    type: inviteType,
    agencyId: opts.agencyId ?? null,
    token,
    status: "pending",
    expiresAt,
    meta: { invitedBy: "admin" },
  });

  const origin = await getOriginServer();
  const next = defaultNextForInviteType(inviteType);

  await sendPortalInviteEmail({
    to: opts.email,
    firstName: opts.firstName,
    appUrl: origin,
    inviteToken: token,
    next,
  });

  return { token };
}

async function sendCognitoInviteEmail(opts: {
  email: string;
  phone?: string;
  role: UserRole;
  agencyId?: string | null;
}) {
  const cognito = cognitoClient();
  const pool = userPoolId();

  // Ensure user exists + attributes correct (not branded)
  const ensured = await ensureCognitoUserAndAttributes({
    email: opts.email,
    phone: opts.phone,
    role: opts.role,
    agencyId: opts.agencyId ?? null,
    branded: false,
  });

  // If existed, try RESEND; fallback reset password email
  if (ensured.existed) {
    try {
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: pool,
          Username: opts.email,
          MessageAction: "RESEND",
        })
      );
      return { fallback: undefined as string | undefined };
    } catch {
      await cognito.send(
        new AdminResetUserPasswordCommand({
          UserPoolId: pool,
          Username: opts.email,
        })
      );
      return { fallback: "reset_password" };
    }
  }

  // If newly created, Cognito invite was already sent
  return { fallback: undefined as string | undefined };
}

/* ─────────────────────────────────────────────
   CREATE CLIENT (Form Action) — returns void
───────────────────────────────────────────── */

async function createClientInternal(formData: FormData) {
  const parsed = CreateClientSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    firstName: String(formData.get("firstName") ?? "").trim() || undefined,
    lastName: String(formData.get("lastName") ?? "").trim() || undefined,
    role: (String(formData.get("role") ?? "").trim() || undefined) as any,
    agencyId: String(formData.get("agencyId") ?? "").trim() || undefined,
    inviteMode: (String(formData.get("inviteMode") ?? "").trim() ||
      undefined) as any,
  });

  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input." };
  }

  const { email, phone, firstName, lastName, agencyId } = parsed.data;
  const inviteMode: InviteMode = parsed.data.inviteMode ?? "branded";
  const role: UserRole = parsed.data.role ?? "TAXPAYER";

  try {
    if (inviteMode === "branded") {
      await sendBrandedInviteEmail({
        email,
        phone,
        firstName,
        role,
        agencyId: agencyId ?? null,
      });
    } else {
      await sendCognitoInviteEmail({
        email,
        phone,
        role,
        agencyId: agencyId ?? null,
      });
    }
  } catch (e: any) {
    return {
      ok: false as const,
      error: e?.message ?? "Failed to create/send invite.",
    };
  }

  let sub: string;
  try {
    sub = await getCognitoSub(email);
  } catch (e: any) {
    return {
      ok: false as const,
      error: e?.message ?? "Could not read Cognito sub.",
    };
  }

  const [row] = await db
    .insert(users)
    .values({
      cognitoSub: sub,
      email,
      phone: phone ?? null,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      role,
      agencyId: agencyId ?? null,
      filingClient: role === "TAXPAYER",
    })
    .onConflictDoUpdate({
      target: users.cognitoSub,
      set: {
        email,
        phone: phone ?? null,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        role,
        agencyId: agencyId ?? null,
        filingClient: role === "TAXPAYER",
        updatedAt: new Date(),
      },
    })
    .returning();

  revalidateClientPaths(String(row.id));

  return { ok: true as const, userId: String(row.id), inviteMode };
}

export async function adminCreateClientAndRedirect(
  formData: FormData
): Promise<void> {
  await requireAdminOrRedirect();

  const res = await createClientInternal(formData);

  if (!res.ok || !res.userId) {
    redirect(qs("/admin/clients", { toast: "create_failed", msg: res.error }));
  }

  redirect(
    qs(`/admin/clients/${res.userId}`, {
      toast: "create_ok",
      mode: res.inviteMode,
    })
  );
}

/* ─────────────────────────────────────────────
   RESEND INVITE (Form Action) — returns void
───────────────────────────────────────────── */

export async function adminResendClientInviteFromForm(
  formData: FormData
): Promise<void> {
  await requireAdminOrRedirect();

  const parsed = ResendSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    inviteMode: String(formData.get("inviteMode") ?? "").trim(),
    firstName: String(formData.get("firstName") ?? "").trim() || undefined,
    role: (String(formData.get("role") ?? "").trim() || undefined) as any,
    agencyId: String(formData.get("agencyId") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    redirect(
      qs("/admin/clients", { toast: "resend_failed", msg: "Invalid input." })
    );
  }

  const email = parsed.data.email;
  const inviteMode: InviteMode = parsed.data.inviteMode;
  const role: UserRole = parsed.data.role ?? "TAXPAYER";
  const agencyId = parsed.data.agencyId ?? null;

  try {
    if (inviteMode === "branded") {
      await sendBrandedInviteEmail({
        email,
        firstName: parsed.data.firstName,
        role,
        agencyId,
      });

      redirect(qs("/admin/clients", { toast: "resend_ok", mode: "branded" }));
    } else {
      const r = await sendCognitoInviteEmail({
        email,
        role,
        agencyId,
      });

      redirect(
        qs("/admin/clients", {
          toast: "resend_ok",
          mode: "cognito",
          fallback: r.fallback,
        })
      );
    }
  } catch (e: any) {
    redirect(
      qs("/admin/clients", {
        toast: "resend_failed",
        msg: e?.message ?? "Resend failed.",
      })
    );
  }
}

/* ─────────────────────────────────────────────
   Existing admin updates
───────────────────────────────────────────── */

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
