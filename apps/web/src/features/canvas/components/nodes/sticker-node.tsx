"use client";

import { type NodeProps, NodeResizer } from "@xyflow/react";
import { Upload } from "lucide-react";
import { useRef } from "react";
import { uploadAsset } from "@/features/projects";
import { useCanvasActions } from "../canvas-actions";

export type StickerVariant = "note" | "rectangle" | "line" | "emoji" | "image";

interface StickerData {
  variant: StickerVariant;
  text?: string;
  emoji?: string;
  src?: string;
  color?: string;
  locked?: boolean;
}

export function StickerNode({ id, data, selected }: NodeProps) {
  const { variant, text, emoji, src, color, locked } = (data ?? {}) as unknown as StickerData;
  const { setNodeData } = useCanvasActions();
  const fileRef = useRef<HTMLInputElement>(null);

  const isSelected = Boolean(selected);
  const isLocked = Boolean(locked);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const res = await uploadAsset(f);
      setNodeData(id, { src: res.url });
    } catch {
      // handled globally
    }
  };

  const body = (() => {
    if (variant === "note") {
      return (
        <div
          style={{ backgroundColor: color || "#fef08a" }}
          className="flex h-full min-h-[140px] min-w-[140px] flex-col p-4 font-handwriting text-[#713f12] shadow-lg rounded-xl border border-[#fde047]/50"
        >
          <textarea
            value={text ?? ""}
            placeholder="Sticky note..."
            onChange={(e) => setNodeData(id, { text: e.target.value })}
            className="h-full w-full resize-none bg-transparent font-medium text-sm outline-none placeholder:text-[#a16207]/60"
          />
        </div>
      );
    }

    if (variant === "rectangle") {
      return (
        <div
          style={{ borderColor: color || "#38bdf8", backgroundColor: `${color || "#38bdf8"}20` }}
          className="h-full min-h-[80px] min-w-[120px] rounded-xl border-2 shadow-sm"
        />
      );
    }

    if (variant === "line") {
      return <div style={{ backgroundColor: color || "#f43f5e" }} className="h-1.5 w-full rounded-full shadow-sm" />;
    }

    if (variant === "emoji") {
      return <div className="grid select-none text-6xl place-items-center drop-shadow-md">{emoji || "✨"}</div>;
    }

    if (variant === "image") {
      return (
        <div className="group/img relative h-full min-h-[120px] min-w-[120px] overflow-hidden rounded-xl border border-border bg-card/60 shadow-md">
          {src ? (
            <img src={src} alt="Sticker" className="h-full w-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Upload className="size-5" />
              <span className="text-xs">Image</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </div>
      );
    }

    return null;
  })();

  return (
    <div className="relative">
      <NodeResizer
        isVisible={isSelected && !isLocked && (variant === "note" || variant === "rectangle" || variant === "image")}
        minWidth={80}
        minHeight={60}
        handleClassName="!size-2.5 !bg-teal-400 !border-white"
      />
      {body}
    </div>
  );
}
