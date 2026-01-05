// app/(client)/(protected)/(app)/files/page.tsx

import FilesClient from "@/app/(client)/(protected)/_components/FilesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

export default function FilesPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: BRAND.pink }}
          >
            Client Portal
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            Files
          </h1>

          <div
            className="mt-2 h-1 w-28 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
            }}
          />

          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            This is your personal upload area. Add W-2s, 1099s, IDs, receipts, and
            any supporting documents you want your tax preparer to review.
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Note:</span> The{" "}
            <span className="font-semibold">Documents</span> tab is for files sent
            to you by your tax preparer (office-use / delivered docs).{" "}
            <span className="font-semibold">Files</span> is what you upload.
          </div>
        </div>

        {/* Upload + list */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* ✅ self view: no props */}
          <FilesClient />
        </div>
      </div>
    </main>
  );
}
