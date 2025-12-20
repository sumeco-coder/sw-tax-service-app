import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Confirm admin email</h1>
            <p className="mt-2 text-sm text-slate-600">Loading…</p>
          </div>
        </div>
      }
    >
      <ConfirmClient />
    </Suspense>
  );
}
