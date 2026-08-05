"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { cropAsset } from "@/features/projects";

const RATIOS = [
  { label: "Free", aspect: 0 },
  { label: "1:1", aspect: 1 },
  { label: "16:9", aspect: 16 / 9 },
  { label: "9:16", aspect: 9 / 16 },
  { label: "4:3", aspect: 4 / 3 },
  { label: "3:4", aspect: 3 / 4 },
];

export function ImageCropModal({
  nodeId,
  src,
  onCommit,
  onClose,
}: {
  nodeId: string;
  src: string;
  onCommit: (nodeId: string, url: string) => void;
  onClose: () => void;
}) {
  const [aspect, setAspect] = useState(0);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0.1,
    y: 0.1,
    w: 0.8,
    h: 0.8,
  });
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!aspect) return;
    setCrop((c) => {
      let w = c.w;
      let h = w / aspect;
      if (h > 0.9) {
        h = 0.9;
        w = h * aspect;
      }
      return { x: Math.max(0, 0.5 - w / 2), y: Math.max(0, 0.5 - h / 2), w, h };
    });
  }, [aspect]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await cropAsset(src, { x: crop.x, y: crop.y, width: crop.w, height: crop.h });
      onCommit(nodeId, res.url);
      toast.success("Image cropped successfully");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Crop failed");
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Crop Image</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/40 p-4">
          <img ref={imgRef} src={src} alt="Crop target" className="max-h-[60vh] object-contain" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {RATIOS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setAspect(r.aspect)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  aspect === r.aspect ? "bg-teal-400 text-black" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-black hover:bg-teal-300 disabled:opacity-50"
          >
            <Check className="size-4" /> Save Crop
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
