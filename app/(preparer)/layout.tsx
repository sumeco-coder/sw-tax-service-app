// app/(preparer)/layout.tsx
import { requireRole } from "@/lib/auth/guards";

export default async function PreparerLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["LMS_PREPARER"], {
    redirectTo: "/sign-in",
    notAuthorizedTo: "/not-authorized",
    allowAdmin: true,
  });

  return <>{children}</>;
}
