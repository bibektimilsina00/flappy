"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactCrop, { centerCrop, type Crop, makeAspectCrop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { cropAsset } from "@/features/projects";

const PRESETS: { label: string; value?: number }[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
];

function initialCrop(w: number, h: number, aspect?: number): Crop {
  return centerCrop(makeAspectCrop({ unit: "%", width: 80 }, aspect ?? w / h, w, h), w, h);
}

export function ImageCropModal({
  src,
  onDone,
  onClose,
}: {
  src: string;
  onDone: (result: { key: string; url: string }) => void;
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const reset = (a?: number) => {
    setAspect(a);
    const img = imgRef.current;
    if (img) setCrop(initialCrop(img.width, img.height, a));
  };

  const create = async () => {
    const img = imgRef.current;
    if (!img || !completed?.width) return;
    setBusy(true);
    try {
      const sx = img.naturalWidth / img.width;
      const sy = img.naturalHeight / img.height;
      const result = await cropAsset(src, {
        x: Math.round(completed.x * sx),
        y: Math.round(completed.y * sy),
        width: Math.round(completed.width * sx),
        height: Math.round(completed.height * sy),
      });
      onDone(result);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Crop failed");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="dark fixed inset-0 z-[200] flex flex-col bg-black/95">
      <div className="flex justify-center py-4">
        <div className="flex items-center gap-3 rounded-full bg-[#1e1e1e] px-4 py-2">
          <span className="text-sm font-medium">Crop image</span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
        <ReactCrop
          crop={crop}
          onChange={(_, pct) => setCrop(pct)}
          onComplete={(c) => setCompleted(c)}
          aspect={aspect}
        >
          {/* biome-ignore lint/a11y/useAltText: editor asset */}
          <img
            ref={imgRef}
            src={src}
            onLoad={(e) => setCrop(initialCrop(e.currentTarget.width, e.currentTarget.height, aspect))}
            className="max-h-[72vh] object-contain"
          />
        </ReactCrop>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-1 rounded-full bg-[#1e1e1e] p-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => reset(p.value)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                aspect === p.value ? "bg-white text-black" : "text-foreground/80 hover:bg-white/10"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => reset(aspect)}
            className="rounded-lg px-3 py-1.5 text-sm text-foreground/80 hover:bg-white/10"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={create}
            disabled={busy || !completed?.width}
            className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Cropping…" : "Create crop"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
