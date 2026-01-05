// app/(client)/(protected)/documents/page.tsx
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";
import DocumentsClient from "./_components/DocumentsClient"

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientDocumentsPage() {
  const auth = await getServerRole();
  if (!auth) return redirect("/sign-in");

  const sub = String(auth.sub ?? "");
  if (!sub) return redirect("/sign-in");

  const [u] = await db
    .select({ id: users.id, onboardingStep: users.onboardingStep })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!u) return redirect("/onboarding");

  const step = String(u.onboardingStep ?? "");
  if (step !== "SUBMITTED" && step !== "DONE") {
    return redirect("/onboarding/agreements"); // ✅ required
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <DocumentsClient targetUserId={String(u.id)} mode="client" />
      </div>
    </main>
  );
}
