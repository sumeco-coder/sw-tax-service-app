// app/(client)/onboarding/_components/DocumentList.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { listDocuments, deleteDocument } from "../../onboarding/documents/actions";

type DocumentRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  key: string;
  uploadedAt: Date;
};

export default function DocumentList({ cognitoSub }: { cognitoSub: string }) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await listDocuments(cognitoSub);
        if (!cancelled) {
          setDocs(result as DocumentRecord[]);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Failed to load documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cognitoSub]);

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteDocument(id, cognitoSub);
        setDocs((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        console.error(err);
        setError("Failed to delete document.");
      }
    });
  }

  if (loading) {
    return (
      <div className="mt-4 text-xs text-slate-500">
        Loading your uploaded documents…
      </div>
    );
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
      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="space-y-2">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
          >
            <div className="flex flex-col">
              <span className="font-medium text-slate-900">
                {doc.fileName}
              </span>
              <span className="text-[11px] text-slate-500">
                {(doc.size / 1024 / 1024).toFixed(2)} MB · {doc.mimeType}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(doc.id)}
              disabled={isPending}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
            >
              {isPending ? "…" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
