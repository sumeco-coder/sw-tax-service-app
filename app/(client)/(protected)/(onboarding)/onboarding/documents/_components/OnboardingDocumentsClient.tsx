// app/(client)/(protected)/(onboarding)/onboarding/documents/_components/OnboardingDocumentsClient.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import {
  onboardingListMyDocuments,
  onboardingCreateMyUploadUrl,
  onboardingFinalizeMyUpload,
  onboardingCreateMyDownloadUrl,
} from "../actions";

type DocItem = {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
};

export default function OnboardingDocumentsClient() {
  const [busy, startTransition] = useTransition();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
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

      setDocs([]);
      setError(res.message || "Failed to load documents.");
      return;
    }

    setDocs(res.data);
    setError(null);
  }

  useEffect(() => {
    startTransition(() => {
      refresh().catch((e: any) =>
        setError(e?.message || "Failed to load documents.")
      );
    });
     
  }, []);

  async function uploadOne(file: File) {
    setError(null);

    const contentType = file.type || "application/octet-stream";

    // 1) presign PUT (matches your onboardingCreateMyUploadUrl action)
    const presign = await onboardingCreateMyUploadUrl({
      fileName: file.name,
      contentType,
    });

    if (!presign.ok) {
      if (presign.code === "UNAUTHENTICATED") {
        window.location.href =
          "/sign-in?next=" + encodeURIComponent("/onboarding/documents");
        return;
      }
      if (presign.code === "NO_USER_ROW") {
        window.location.href = "/onboarding";
        return;
      }
      setError(presign.message || "Failed to create upload URL.");
      return;
    }

    // 2) PUT to S3
    const up = await fetch(presign.data.url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });

    if (!up.ok) {
      throw new Error(`Upload failed (${up.status}).`);
    }

    // 3) finalize (HeadObject + DB insert AFTER upload exists)
    const fin = await onboardingFinalizeMyUpload({
      key: presign.data.key,
      fileName: file.name,
    });

    if (!fin.ok) {
      if (fin.code === "UNAUTHENTICATED") {
        window.location.href =
          "/sign-in?next=" + encodeURIComponent("/onboarding/documents");
        return;
      }
      if (fin.code === "NO_USER_ROW") {
        window.location.href = "/onboarding";
        return;
      }
      setError(
        fin.message ||
          "Upload finished but could not be finalized. Please try again."
      );
      return;
    }

    // 4) refresh list
    await refresh();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    startTransition(() => {
      uploadOne(f)
        .then(() => {
          e.target.value = "";
        })
        .catch((err: any) => {
          console.error(err);
          setError(err?.message || "Upload failed.");
        });
    });
  }

  async function handleDownload(doc: DocItem) {
    setError(null);

    const res = await onboardingCreateMyDownloadUrl(doc.key);

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
      setError(res.message || "Download failed.");
      return;
    }

    window.open(res.data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-sm font-semibold text-slate-900">Upload</label>
        <input
          type="file"
          disabled={busy}
          onChange={onPickFile}
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
        />
        <p className="mt-2 text-xs text-slate-500">
          Upload → verify in S3 → save in DB (prevents phantom downloads).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">
            Uploaded documents
          </p>
          <button
            disabled={busy}
            onClick={() => startTransition(() => refresh())}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
            No documents uploaded yet.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {docs.map((doc) => (
              <li
                key={doc.key}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900">{doc.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {doc.lastModified
                      ? new Date(doc.lastModified).toLocaleString()
                      : ""}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => startTransition(() => handleDownload(doc))}
                  className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-60"
                  disabled={busy}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
