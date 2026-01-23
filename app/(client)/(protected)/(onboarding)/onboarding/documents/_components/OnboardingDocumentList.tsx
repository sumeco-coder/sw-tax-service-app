"use client";

import { useEffect, useState } from "react";
import {
  onboardingListMyDocuments,
  onboardingCreateMyDownloadUrl,
} from "../actions";

type DocItem = {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
};

export default function OnboardingDocumentList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const res = await onboardingListMyDocuments();

      if (!res.ok) {
        if (res.code === "UNAUTHENTICATED") {
          window.location.href =
            "/sign-in?next=" + encodeURIComponent("/onboarding/documents");
          return;
        }
        if (res.code === "NO_USER_ROW") {
          window.location.href = "/onboarding";
          return;
        }
        if (!cancelled) setError("Failed to load documents.");
        if (!cancelled) setDocs([]);
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setDocs(res.data);
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function handleDownload(doc: DocItem) {
    const res = await onboardingCreateMyDownloadUrl(doc.key);

    if (!res.ok) {
      if (res.code === "UNAUTHENTICATED") {
        window.location.href =
          "/sign-in?next=" + encodeURIComponent("/onboarding/documents");
        return;
      }
      setError("Failed to download document.");
      return;
    }

    window.open(res.data.url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return <div className="mt-4 text-xs text-slate-500">Loading your uploaded documents…</div>;
  }

  if (error) {
    return <p className="mt-2 text-xs text-red-600">{error}</p>;
  }

  if (!docs.length) {
    return (
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
        No documents uploaded yet. Once you upload, they will appear here.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-semibold text-slate-900">Uploaded documents</p>

      <ul className="space-y-2">
        {docs.map((doc) => (
          <li
            key={doc.key}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
          >
            <div className="flex flex-col">
              <span className="font-medium text-slate-900">{doc.name}</span>
              <span className="text-[11px] text-slate-500">
                {doc.lastModified ? new Date(doc.lastModified).toLocaleString() : ""}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleDownload(doc)}
              className="text-[11px] font-semibold text-slate-700 hover:text-slate-900"
            >
              Download
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
