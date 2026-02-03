// app/(admin)/admin/(protected)/clients/[userId]/documents/request/_components/WatermarkTool.tsx
"use client";

import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import Link from "next/link";

import {
  createUploadUrl,
  finalizeUpload,
} from "@/app/(client)/(protected)/(app)/files/actions";

type Props = {
  targetUserIdOrSub: string; // ✅ can be cognitoSub (preferred) or legacy users.id
  clientDbUserId: string; // ✅ for linking to admin pages
};

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fileToImageBitmap(file: File) {
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type });
  return await createImageBitmap(blob);
}

export default function WatermarkTool({ targetUserIdOrSub, clientDbUserId }: Props) {
  const [busy, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [wmText, setWmText] = useState("SW TAX SERVICE • CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.18);
  const [scale, setScale] = useState(1);
  const [repeat, setRepeat] = useState(true);

  const canProcess = useMemo(() => !!file && file.type.startsWith("image/"), [file]);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(""), 2500);
    return () => clearTimeout(t);
  }, [ok]);

  async function buildWatermarkedImageBlob(): Promise<{
    blob: Blob;
    outName: string;
    contentType: string;
  }> {
    if (!file) throw new Error("Choose a file first.");
    if (!file.type.startsWith("image/")) {
      throw new Error("Watermark tool supports images only (PNG/JPG/WebP).");
    }

    const bmp = await fileToImageBitmap(file);
    const w = Math.floor(bmp.width * scale);
    const h = Math.floor(bmp.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");

    ctx.drawImage(bmp, 0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(0.4, opacity));
    ctx.fillStyle = "#000";

    const fontSize = Math.max(18, Math.round(Math.min(w, h) * 0.04));
    ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.translate(w / 2, h / 2);
    ctx.rotate((-25 * Math.PI) / 180);

    const text = (wmText || "").trim() || "CONFIDENTIAL";

    if (repeat) {
      const stepX = Math.max(240, Math.round(w * 0.35));
      const stepY = Math.max(180, Math.round(h * 0.25));
      for (let y = -h; y <= h; y += stepY) {
        for (let x = -w; x <= w; x += stepX) {
          ctx.fillText(text, x, y);
        }
      }
    } else {
      ctx.fillText(text, 0, 0);
    }

    ctx.restore();

    const contentType = file.type === "image/png" ? "image/png" : "image/jpeg";

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (!b) return reject(new Error("Failed to create image blob."));
        resolve(b);
      }, contentType, 0.92);
    });

    const base = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const ext = contentType === "image/png" ? "png" : "jpg";
    const outName = `${base}-watermarked.${ext}`;

    return { blob, outName, contentType };
  }

  async function uploadToClientFolder() {
    setErr("");
    setOk("");

    const { blob, outName, contentType } = await buildWatermarkedImageBlob();

    // ✅ Files module expects: targetUserIdOrSub
    const out = await createUploadUrl({
      targetUserIdOrSub,
      fileName: outName,
      contentType,
    });

    const put = await fetch(out.url, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: blob,
    });

    if (!put.ok) throw new Error("Upload failed.");

    // ✅ optional but recommended (verifies it exists)
    await finalizeUpload({
      targetUserIdOrSub,
      key: out.key,
      fileName: outName,
    });

    setOk("Uploaded ✅");
  }

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Watermark tool (optional)</h2>
        <p className="text-xs text-muted-foreground">
          Adds a watermark to images, then uploads the copy into the client’s <span className="font-semibold">Uploads</span> folder.
        </p>
      </div>

      {err ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-xl border bg-emerald-500/10 p-3 text-sm text-emerald-700">
          {ok}{" "}
          <Link className="underline" href={`/admin/clients/${clientDbUserId}/files`}>
            View uploads
          </Link>
        </div>
      ) : null}

      <input
        type="file"
        accept="image/*"
        disabled={busy}
        className="block w-full cursor-pointer rounded-xl border border-border px-3 py-2 text-sm bg-secondary/40"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setErr("");
          setOk("");
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Watermark text</label>
          <input
            value={wmText}
            onChange={(e) => setWmText(e.target.value)}
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Opacity</label>
          <input
            type="range"
            min={0.05}
            max={0.4}
            step={0.01}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-[11px] text-muted-foreground">{opacity.toFixed(2)}</div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Scale</label>
          <input
            type="number"
            step={0.05}
            min={0.5}
            max={2}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value) || 1)}
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
          />
          <div className="text-[11px] text-muted-foreground">1 = original size</div>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            id="repeat"
            type="checkbox"
            checked={repeat}
            onChange={(e) => setRepeat(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="repeat" className="text-sm">
            Repeat watermark
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={!file || !canProcess || busy}
          className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
          onClick={() =>
            startTransition(() => {
              setErr("");
              setOk("");
              buildWatermarkedImageBlob()
                .then(({ blob, outName }) => downloadBlob(blob, outName))
                .catch((e: any) => setErr(e?.message ?? "Failed to watermark."));
            })
          }
        >
          Download watermarked
        </button>

        <button
          disabled={!file || !canProcess || busy}
          className="rounded-xl border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          onClick={() =>
            startTransition(() => {
              uploadToClientFolder().catch((e: any) =>
                setErr(e?.message ?? "Upload failed."),
              );
            })
          }
        >
          Upload to client folder
        </button>
      </div>
    </div>
  );
}
