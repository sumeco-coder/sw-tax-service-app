// lib/auth/roleServer.ts
import { runWithAmplifyServerContext } from "aws-amplify/adapter-core";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth/server";
import { amplifyServerConfig } from "@/lib/amplifyServerConfig";
import type { AppRole } from "./roleClient";

export async function getServerRole() {
  try {
    const { user, session } = (await runWithAmplifyServerContext(
      amplifyServerConfig,
      {},
      async (contextSpec) => {
        const [user, session] = await Promise.all([
          getCurrentUser(contextSpec),
          fetchAuthSession(contextSpec),
        ]);
        return { user, session };
      },
    )) as any;

    if (!user || !session) return null;

    const idToken: any = session.tokens?.idToken;
    const payload: any = idToken?.payload ?? {};

    const groups: string[] = payload["cognito:groups"] ?? [];
    const customRole = payload["custom:role"] as string | undefined;

    const role: AppRole =
      (customRole as AppRole) ??
      (groups.includes("admin")
        ? "admin"
        : groups.includes("lms-admin")
        ? "lms-admin"
        : groups.includes("lms-preparer")
        ? "lms-preparer"
        : groups.includes("taxpayer")
        ? "taxpayer"
        : "unknown");

    return { id: user.userId, email: user.username, role, groups, payload };
  } catch (err) {
    console.error("getServerRole error:", err);
    return null;
  }
}
