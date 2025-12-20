import { requireRole } from "@/lib/auth/guards";

export default async function PreparerLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["lms-preparer"], {
    redirectTo: "/sign-in",
    notAuthorizedTo: "/not-authorized",
    allowAdmin: true,
  });

  return <>{children}</>;
}
