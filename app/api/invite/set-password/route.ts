import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import outputs from "@/amplify_outputs.json";
import { db } from "@/drizzle/db";
import { invites } from "@/drizzle/schema";

import {
  CognitoIdentityProviderClient,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  invite: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(8),
});

function getCognitoConfig() {
  const region = String(
    process.env.COGNITO_REGION ?? (outputs as any)?.auth?.aws_region ?? "",
  ).trim();

  const poolId = String(
    process.env.COGNITO_USER_POOL_ID ??
      (outputs as any)?.auth?.user_pool_id ??
      "",
  ).trim();

  if (!region) throw new Error("Missing Cognito region");
  if (!poolId) throw new Error("Missing Cognito user pool id");

  return { region, poolId };
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid input." },
        { status: 400 },
      );
    }

    const { invite, email, password } = parsed.data;

    // 1) Validate invite token in DB
    const [row] = await db
      .select({
        token: invites.token,
        email: invites.email,
        status: invites.status,
        expiresAt: invites.expiresAt,
      })
      .from(invites)
      .where(and(eq(invites.token, invite), eq(invites.status, "pending")))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Invite is invalid or already used." },
        { status: 400 },
      );
    }

    if (String(row.email).toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: "Invite/email mismatch." },
        { status: 400 },
      );
    }

    // ✅ Expire it in DB if needed
    if (row.expiresAt && new Date(row.expiresAt as any).getTime() < Date.now()) {
      await db
        .update(invites)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(invites.token, invite));

      return NextResponse.json(
        { ok: false, error: "Invite has expired." },
        { status: 400 },
      );
    }

    // 2) Set permanent password in Cognito (no Cognito email sent)
    const { region, poolId } = getCognitoConfig();
    const cognito = new CognitoIdentityProviderClient({ region });

    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: poolId,
        Username: email,
        Password: password,
        Permanent: true,
      }),
    );

    // 3) Mark invite as accepted
    await db
      .update(invites)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(invites.token, invite));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const name = String(e?.name ?? "");
    const msg =
      name === "UserNotFoundException"
        ? "User was not found in the portal. Please ask us to resend your invite."
        : e?.message ?? "Failed to set password.";

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
