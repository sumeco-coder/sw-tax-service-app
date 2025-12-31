// lib/auth/getServerUser.ts
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";
import type { AppRole, ServerUser } from "./types";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeRole(role: unknown): AppRole {
  return String(role ?? "")
    .trim()
    .toUpperCase() as AppRole; // ✅ ONE controlled cast
}

/* ─────────────────────────────────────────────
   getServerUser (TYPED)
───────────────────────────────────────────── */
export async function getServerUser(): Promise<ServerUser | null> {
  const r = await getServerRole();
  if (!r?.sub) return null;

  const cognitoSub = String(r.sub).trim();
  const email = normalizeEmail(r.email);
  const role = normalizeRole(r.role); // ✅ AppRole, NOT string

  if (!cognitoSub || !email) return null;

  await db
    .insert(users)
    .values({
      cognitoSub,
      email,
      onboardingStep: "PROFILE" as any,
      updatedAt: new Date(),
    } as any)
    .onConflictDoUpdate({
      target: users.cognitoSub,
      set: { email, updatedAt: new Date() },
    });

  const [u] = await db
    .select({
      id: users.id,
      email: users.email,
      cognitoSub: users.cognitoSub,
      onboardingStep: users.onboardingStep,
    })
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (!u?.id) return null;

  return {
    userId: u.id,
    sub: cognitoSub,
    email: u.email,
    role, // ✅ STRICT AppRole
    onboardingStep: u.onboardingStep,
  };
}
