//lib/auth/requireClientUser.server.ts
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

function extractSub(auth: any) {
  if (!auth) return null;
  if (typeof auth === "string") return auth;
  return auth.sub ?? auth.userSub ?? auth.cognitoSub ?? auth?.user?.sub ?? null;
}

export async function requireClientUser() {
  const auth = await getServerRole();
  const sub = extractSub(auth);

  if (!sub) redirect("/sign-in");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!user) redirect("/sign-in");

  return { user, auth };
}
