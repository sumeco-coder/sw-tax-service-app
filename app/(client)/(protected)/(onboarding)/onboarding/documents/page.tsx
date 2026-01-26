import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";
import OnboardingDocumentsClient from "./_components/OnboardingDocumentsClient";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

function oneParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function OnboardingDocumentsPage({ searchParams }: PageProps) {
  const auth = await getServerRole();
  const sub = String(auth?.sub ?? "").trim();

  if (!sub) {
    const invite = (oneParam(searchParams?.invite) ?? "").trim();
    const nextUrl = invite
      ? `/onboarding/documents?invite=${encodeURIComponent(invite)}`
      : "/onboarding/documents";

    redirect(`/sign-in?next=${encodeURIComponent(nextUrl)}`);
  }

  // Ensure they exist in DB (prevents server-action redirect surprises)
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!u) redirect("/onboarding");

  return <OnboardingDocumentsClient />;
}
