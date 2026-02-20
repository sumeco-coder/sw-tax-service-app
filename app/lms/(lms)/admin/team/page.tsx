import { Suspense } from "react";
import TeamPageClient from "./components/TeamPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-300">Loading…</div>}>
      <TeamPageClient />
    </Suspense>
  );
}