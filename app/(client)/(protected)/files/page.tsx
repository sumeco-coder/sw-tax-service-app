// app/(client)/files/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import FilesClient from "../_components/FilesClient";
import { configureAmplify } from "@/lib/amplifyClient";
configureAmplify();

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const brandBar = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

export default function FilesPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setUserId(u.userId))
      .catch(() => setUserId(null));
  }, []);

  if (userId === null) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">My Files</h1>
          <div className="mt-2 h-1 w-20 rounded-full" style={brandBar} />
          <p className="mt-3 text-sm text-slate-600">
            Please sign in to view your files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            My Files
          </h1>
          <div className="mt-2 h-1 w-24 rounded-full" style={brandBar} />
          <p className="mt-3 text-sm text-slate-600">
            Upload your documents and access files your preparer shares with you.
          </p>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <FilesClient userId={userId} />
        </div>
      </div>
    </div>
  );
}
