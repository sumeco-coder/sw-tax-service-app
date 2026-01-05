// app/(client)/onboarding/_components/DocumentList.tsx
"use client";

import { useEffect, useState } from "react";
import { listMyDocuments, createMyDownloadUrl } from "../../files/actions";

type DocItem = {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
};

export default function DocumentList() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const items = (await listMyDocuments()) as any[];

        const mapped: DocItem[] = (items ?? []).map((o) => ({
          key: String(o.key),
          size: Number(o.size ?? 0),
          lastModified: o.lastModified ? String(o.lastModified) : null,
          name: prettifyName(String(o.name ?? o.key)),
        }));

        // newest first (optional)
        mapped.sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""));

        if (!cancelled) setDocs(mapped);
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
  }, []);

  async function handleDownload(doc: DocItem) {
    try {
      const { url } = await createMyDownloadUrl(doc.key);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      setError("Failed to download document.");
    }
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
            key={doc.key}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
          >
            <div className="flex flex-col">
              <span className="font-medium text-slate-900">{doc.name}</span>
              <span className="text-[11px] text-slate-500">
                {formatBytes(doc.size)}
                {doc.lastModified ? ` · ${new Date(doc.lastModified).toLocaleString()}` : ""}
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

// If your S3 object names are "{uuid}-{filename}", this makes display nicer
function prettifyName(name: string) {
  return name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}
