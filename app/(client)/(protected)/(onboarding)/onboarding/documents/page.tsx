// app/(client)/(protected)/(onboarding)/onboarding/documents/page.tsx
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";
import OnboardingDocumentsClient from "./_components/OnboardingDocumentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

function oneParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function OnboardingDocumentsPage({ searchParams }: PageProps) {
  let auth: any = null;
  try {
    auth = await getServerRole();
  } catch (e) {
    console.error("getServerRole failed on /onboarding/documents", e);
    auth = null;
  }

  // If not signed in, send them to sign-in AND bring them back here
  if (!auth?.sub) {
    const invite = (oneParam(searchParams?.invite) ?? "").trim();

    const qs = new URLSearchParams();
    if (invite) qs.set("invite", invite);
    qs.set("next", "/onboarding/documents");

    redirect(`/sign-in?${qs.toString()}`);
  }

  return <OnboardingDocumentsClient />;
}
