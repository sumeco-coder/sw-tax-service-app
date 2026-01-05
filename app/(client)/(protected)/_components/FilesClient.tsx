// app/(client)/(protected)/_components/FilesClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileDown, Files, UploadCloud } from "lucide-react";
import { Toaster, toast } from "sonner";

import {
  listMyDocuments,
  listClientDocuments,
  createMyUploadUrl,
  createUploadUrl,
  createMyDownloadUrl,
  createDownloadUrl,
} from "../(app)/files/actions";

type DocRow = {
  key: string;
  fileName: string;
  size: number;
  uploadedAt: string | null; // ISO string
};

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

const focusRing =
  "focus:outline-none focus:ring-2 focus:ring-[rgba(231,43,105,0.22)] focus:border-[rgba(231,43,105,0.35)]";

/**
 * ✅ Taxpayer self view:
 *   <FilesClient />
 *
 * ✅ Staff/admin viewing a target taxpayer uploads folder:
 *   <FilesClient targetUserIdOrSub="{COGNITO_SUB}" />
 *
 * NOTE: `targetUserIdOrSub` here should be the SAME folder id your S3 uses.
 * With the actions we wrote: that means Cognito sub.
 */
export default function FilesClient({
  targetUserIdOrSub,
}: {
  targetUserIdOrSub?: string;
}) {
  const target = useMemo(
    () => String(targetUserIdOrSub ?? "").trim() || null,
    [targetUserIdOrSub]
  );

  const isSelf = !target;

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    const items = target
      ? ((await listClientDocuments(target)) as any[])
      : ((await listMyDocuments()) as any[]);

    const mapped: DocRow[] = (items ?? []).map((x) => ({
      key: String(x.key),
      size: Number(x.size ?? 0),
      uploadedAt: x.lastModified ? String(x.lastModified) : null,
      fileName: prettifyName(String(x.name ?? x.key)),
    }));

    mapped.sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
    setDocs(mapped);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        await refresh();
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e?.message || "Failed to load your files.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  async function uploadFiles(files: File[]) {
    if (!files.length) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: max size is 10MB`);
          continue;
        }

        const contentType = file.type || "application/octet-stream";

        const presign = target
          ? await createUploadUrl({
              targetUserIdOrSub: target,
              fileName: file.name,
              contentType,
            })
          : await createMyUploadUrl({
              fileName: file.name,
              contentType,
            });

        const put = await fetch(presign.url, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file,
        });

        if (!put.ok) {
          throw new Error(`Upload failed (${put.status}) for ${file.name}`);
        }
      }

      toast.success(`Uploaded ${files.length} file${files.length > 1 ? "s" : ""}`);
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Upload failed");
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handlePickFiles() {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      await uploadFiles(files);
    };

    input.click();
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    await uploadFiles(files);
  }

  async function handleDownload(doc: DocRow) {
    try {
      const res = target
        ? await createDownloadUrl({ targetUserIdOrSub: target, key: doc.key })
        : await createMyDownloadUrl(doc.key);

      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Download failed");
      setError(e?.message || "Download failed");
    }
  }

  if (loading) return <div className="text-sm text-slate-600">Loading your files…</div>;
  if (error) return <div className="text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-6 text-slate-900">
      <Toaster position="top-center" richColors />

      {/* Upload area */}
      <div
        className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center transition hover:bg-slate-50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.02)" }}
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm" style={brandGradient}>
            <UploadCloud className="h-6 w-6" />
          </div>

          <div className="text-base font-semibold text-slate-900">Drag &amp; drop files here</div>
          <div className="text-xs text-slate-500">or</div>

          <button
            onClick={handlePickFiles}
            disabled={uploading}
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={brandGradient}
          >
            {uploading ? "Uploading…" : "Browse computer"}
          </button>

          <p className="text-xs text-slate-500">
            Accepted: PDF, JPG/PNG, DOCX, XLSX, CSV (up to ~10 MB each)
          </p>

          <div className="mt-2 h-1 w-24 rounded-full" style={brandGradient} />
        </div>
      </div>

      {/* File list */}
      <div className="grid grid-cols-1 gap-3">
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            No files yet. Upload documents here and they’ll show up in this list.
          </div>
        ) : (
          docs.map((doc) => (
            <div key={doc.key} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={brandGradient} aria-hidden="true">
                  <Files className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{doc.fileName}</div>
                  <div className="text-xs text-slate-500">
                    {doc.size ? formatBytes(doc.size) + " • " : ""}
                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : ""}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleDownload(doc)}
                  className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
                  title="Download"
                >
                  <FileDown className="h-4 w-4" /> Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-xs text-slate-500">
        Tip: Files are your uploads. {isSelf ? "(Self view)" : "(Staff/target view)"}
      </div>
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

// If uploads are "{uuid}-{filename}", this makes display nicer
function prettifyName(name: string) {
  return name.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    ""
  );
}
