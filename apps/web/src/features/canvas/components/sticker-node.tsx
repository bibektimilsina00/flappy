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
}

export function StickerNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as StickerData;
  const { setNodeData } = useCanvasActions();
  const sel = Boolean(selected);

  if (d.variant === "note") {
    return (
      <>
        <NodeResizer isVisible={sel} minWidth={120} minHeight={80} />
        <div className="size-full rounded-md bg-[#f5d97a] p-3 text-black shadow-md">
          <textarea
            value={d.text ?? ""}
            onChange={(e) => setNodeData(id, { text: e.target.value })}
            placeholder="Note…"
            className="nodrag nowheel size-full resize-none bg-transparent text-sm outline-none placeholder:text-black/40"
          />
        </div>
      </>
    );
  }

  if (d.variant === "rectangle") {
    return (
      <>
        <NodeResizer isVisible={sel} minWidth={40} minHeight={40} />
        <div className="size-full rounded-md border-2 border-white/70 bg-white/5" />
      </>
    );
  }

  if (d.variant === "line") {
    return (
      <>
        <NodeResizer isVisible={sel} minWidth={40} minHeight={2} />
        <div className="flex size-full items-center">
          <div className="h-0.5 w-full rounded-full bg-white/70" />
        </div>
      </>
    );
  }

  if (d.variant === "emoji") {
    return (
      <>
        <NodeResizer isVisible={sel} minWidth={40} minHeight={40} keepAspectRatio />
        <div className="grid size-full place-items-center [container-type:size]">
          <button
            type="button"
            onDoubleClick={() => {
              const e = window.prompt("Emoji", d.emoji ?? "⭐");
              if (e) setNodeData(id, { emoji: e });
            }}
            className="leading-none"
            style={{ fontSize: "min(80cqw, 80cqh)" }}
          >
            {d.emoji ?? "⭐"}
          </button>
        </div>
      </>
    );
  }

  return <ImageSticker id={id} src={d.src} selected={sel} setSrc={(src) => setNodeData(id, { src })} />;
}

function ImageSticker({
  id: _id,
  src,
  selected,
  setSrc,
}: {
  id: string;
  src?: string;
  selected: boolean;
  setSrc: (src: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { url } = await uploadAsset(file);
      setSrc(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    }
  };

  if (src) {
    return (
      <>
        <NodeResizer isVisible={selected} minWidth={40} minHeight={40} />
        {/* biome-ignore lint/a11y/useAltText: sticker */}
        <img src={src} className="size-full rounded-md object-contain" />
      </>
    );
  }
  return (
    <div className="grid size-full place-items-center rounded-md border border-dashed border-border bg-card/40">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground hover:bg-secondary/80"
      >
        <Upload className="size-4" />
        Upload
      </button>
    </div>
  );
}
