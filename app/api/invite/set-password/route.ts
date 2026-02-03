// app/api/auth/invite/set-password/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/drizzle/db";
import { invites } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import outputs from "@/amplify_outputs.json";

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  invite: z.string().min(10),
  email: z.string().email(),
  newPassword: z.string().min(8),
});

function normEmail(v: string) {
  return v.trim().toLowerCase();
}

function getCognitoConfig() {
  const region = String(
    process.env.COGNITO_REGION ?? (outputs as any)?.auth?.aws_region ?? "",
  ).trim();

  const poolId = String(
    process.env.COGNITO_USER_POOL_ID ?? (outputs as any)?.auth?.user_pool_id ?? "",
  ).trim();

  if (!region) throw new Error("Missing COGNITO_REGION (or outputs.auth.aws_region)");
  if (!poolId) throw new Error("Missing COGNITO_USER_POOL_ID (or outputs.auth.user_pool_id)");

  return { region, poolId };
}

function cognitoClient() {
  const { region } = getCognitoConfig();
  return new CognitoIdentityProviderClient({ region });
}

function randomTempPassword() {
  // Always satisfies typical Cognito policies: upper/lower/number/special + length
  const rand = crypto.randomBytes(8).toString("hex"); // 16 chars
  return `TmpSW!${rand}#9a`;
}

async function safeUpdateAttrs(
  cognito: CognitoIdentityProviderClient,
  poolId: string,
  email: string,
  attrs: { Name: string; Value: string }[],
) {
  try {
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: poolId,
        Username: email,
        UserAttributes: attrs,
      }),
    );
  } catch (e: any) {
    // If custom attrs aren't defined in the pool, Cognito throws InvalidParameterException.
    // We don’t want invites broken because of that.
    const name = String(e?.name ?? "");
    if (name === "InvalidParameterException") return;
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    const email = normEmail(parsed.data.email);
    const token = parsed.data.invite.trim();
    const newPassword = parsed.data.newPassword;

    // 1) Validate invite in DB (pending + match email + not expired)
    const [inv] = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.token, token),
          eq(invites.status, "pending"),
          sql`lower(${invites.email}) = ${email}`,
          eq(invites.type, "taxpayer"),
        ),
      )
      .limit(1);

    if (!inv) {
      return NextResponse.json(
        { ok: false, error: "This invite link is invalid or already used." },
        { status: 400 },
      );
    }

    if (inv.expiresAt && inv.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: "This invite link has expired. Please request a new invite." },
        { status: 400 },
      );
    }

    const { poolId } = getCognitoConfig();
    const cognito = cognitoClient();

    // 2) Ensure Cognito user exists; if not, create it (SUPPRESS Cognito email)
    let exists = true;
    try {
      await cognito.send(new AdminGetUserCommand({ UserPoolId: poolId, Username: email }));
    } catch (e: any) {
      const name = String(e?.name ?? "");
      if (name === "UserNotFoundException") exists = false;
      else throw e;
    }

    if (!exists) {
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: poolId,
          Username: email,
          TemporaryPassword: randomTempPassword(),
          MessageAction: "SUPPRESS",
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "email_verified", Value: "true" },
          ],
        }),
      );
    }

    // 3) Set PERMANENT password to user-chosen password
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: poolId,
        Username: email,
        Password: newPassword,
        Permanent: true,
      }),
    );

    // 4) Update attributes (email_verified always; custom attrs only if pool supports them)
    await safeUpdateAttrs(cognito, poolId, email, [
      { Name: "email_verified", Value: "true" },
      { Name: "custom:role", Value: "taxpayer" },
      { Name: "custom:onboardingComplete", Value: "false" },
    ]);

    // 5) Mark invite as ACCEPTED (correct enum meaning)
    await db
      .update(invites)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(invites.token, token));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("invite set-password failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error." },
      { status: 500 },
    );
  }
}
