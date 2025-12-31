"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
} from "../onboarding/documents/actions";
import { FileDown, Files, Trash2, UploadCloud } from "lucide-react";
import { Toaster, toast } from "sonner";

type DocumentRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  key: string;
  uploadedAt: Date;
};

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

const focusRing =
  "focus:outline-none focus:ring-2 focus:ring-[rgba(231,43,105,0.22)] focus:border-[rgba(231,43,105,0.35)]";

const card =
  "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

export default function FilesClient({ userId }: { userId: string }) {
  // userId is Cognito sub
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await listDocuments(userId);
        if (!cancelled) setDocs(result as DocumentRecord[]);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Failed to load your documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handlePickFiles() {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) return;

      setUploading(true);
      try {
        for (const file of files) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name}: max size is 10MB`);
            continue;
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("cognitoSub", userId);

          const doc = await uploadDocument(formData);
          setDocs((prev) => [...prev, doc as any]);
        }

        toast.success(
          `Uploaded ${files.length} file${files.length > 1 ? "s" : ""}`
        );
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    };

    input.click();
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: max size is 10MB`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("cognitoSub", userId);

        const doc = await uploadDocument(formData);
        setDocs((prev) => [...prev, doc as any]);
      }

      toast.success(
        `Uploaded ${files.length} file${files.length > 1 ? "s" : ""}`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(_doc: DocumentRecord) {
    toast.info("Download not wired yet to a presigned URL.");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this file?")) return;

    startTransition(async () => {
      try {
        await deleteDocument(id, userId);
        setDocs((prev) => prev.filter((d) => d.id !== id));
        toast.success("File deleted");
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Delete failed");
      }
    });
  }

  if (loading) {
    return (
      <div className="text-sm text-slate-600">Loading your files…</div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-rose-700">{error}</div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      <Toaster position="top-center" richColors />

      {/* Upload area */}
      <div
        className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center transition hover:bg-slate-50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
        }}
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm"
            style={brandGradient}
          >
            <UploadCloud className="h-6 w-6" />
          </div>

          <div className="text-base font-semibold text-slate-900">
            Drag & drop files here
          </div>
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

          {/* subtle brand underline */}
          <div className="mt-2 h-1 w-24 rounded-full" style={brandGradient} />
        </div>
      </div>

      {/* File list */}
      <div className="grid grid-cols-1 gap-3">
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            No files yet. Upload documents here or in onboarding and they’ll show
            up in this list.
          </div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* left badge */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={brandGradient}
                  aria-hidden="true"
                >
                  <Files className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {doc.fileName}
                  </div>
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

                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={isPending}
                  className={`inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Small tip */}
      <div className="text-xs text-slate-500">
        Tip: If you upload in onboarding, it will appear here automatically.
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
