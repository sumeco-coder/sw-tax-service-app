"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
} from "@/app/(client)/onboarding/documents/actions";
import { ClipboardList, FileDown, Files, Trash2, UploadCloud } from "lucide-react";
import { Toaster, toast } from "sonner";

type DocumentRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  key: string;
  uploadedAt: Date;
  // if you later add fileUrl to your schema, you can add it here too
};

export default function FilesClient({ userId }: { userId: string }) {
  // here userId is the Cognito sub (same as cognitoSub in onboarding)
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load existing documents from the same system as onboarding
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await listDocuments(userId);
        if (!cancelled) {
          setDocs(result as DocumentRecord[]);
        }
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

  // Upload handler (replaces uploadData + Amplify Storage)
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
          // simple size check – adjust if you like
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name}: max size is 10MB`);
            continue;
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("cognitoSub", userId);
          // email is optional in your action; you can add it here if you have it
          // formData.append("email", userEmail);

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

  // Drag-and-drop upload (same as above, but using drop event)
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

  // For now, simple download = open S3 URL if you store it.
  // If your bucket is private, we’ll later add a /api/documents/download route with a presigned URL.
  async function handleDownload(doc: DocumentRecord) {
    // TEMP: if you later store fileUrl in DB, use that here
    // window.open(doc.fileUrl, "_blank");

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
      <div className="mt-4 text-sm text-gray-600">Loading your files…</div>
    );
  }

  return (
    <div className="mt-4">
      <Toaster position="top-center" richColors />

      {/* Upload area */}
      <div
        className="rounded-2xl border border-dashed bg-white p-6 text-center hover:bg-gray-50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
          <UploadCloud className="h-8 w-8" />
          <div className="text-base font-medium">Drag & drop files here</div>
          <div className="text-xs text-gray-500">or</div>
          <button
            onClick={handlePickFiles}
            disabled={uploading}
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Browse computer"}
          </button>
          <p className="text-xs text-gray-500">
            Accepted: PDF, JPG/PNG, DOCX, XLSX, CSV (up to ~10 MB each)
          </p>
        </div>
      </div>

      {/* File list */}
      <div className="mt-6 grid grid-cols-1 gap-3">
        {docs.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-sm text-gray-600">
            No files yet. Upload documents here or in onboarding and they’ll show
            up in this list.
          </div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Files className="h-5 w-5" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{doc.fileName}</div>
                  <div className="text-xs text-gray-500">
                    {doc.size ? formatBytes(doc.size) + " • " : ""}
                    {doc.uploadedAt
                      ? new Date(doc.uploadedAt).toLocaleString()
                      : ""}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleDownload(doc)}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  title="Download"
                >
                  <FileDown className="h-4 w-4" /> Download
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
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
