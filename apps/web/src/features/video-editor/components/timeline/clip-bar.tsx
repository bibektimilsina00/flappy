"use client";

import { Blend, Music, Type } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/cn";
import type { Clip } from "../../types";

const ACCENT = "#14b8a6";

export function ClipBar({
  clip,
  url,
  trackKind,
  pxPerSec,
  selected,
  dimmed,
  animate,
  onBody,
  onTrimStart,
  onTrimEnd,
  onContext,
}: {
  clip: Clip;
  url?: string;
  trackKind: string;
  pxPerSec: number;
  selected: boolean;
  dimmed?: boolean;
  animate?: boolean;
  onBody: (e: React.PointerEvent) => void;
  onTrimStart: (e: React.PointerEvent) => void;
  onTrimEnd: (e: React.PointerEvent) => void;
  onContext: (e: React.MouseEvent) => void;
}) {
  const w = Math.max(20, clip.duration * pxPerSec);
  const kind = clip.kind;
  const isMedia = kind === "video" || kind === "image";
  const isAudio = kind === "audio" || trackKind === "audio";
  const tiles = Math.max(1, Math.min(12, Math.floor(w / 80))); // filmstrip: one seeked frame per ~80px
  const span = Math.max(0.001, clip.out - clip.in);

  const base =
    kind === "text"
      ? "bg-[#1f9b9b]/85 text-white"
      : kind === "effect" || trackKind === "effect"
        ? "bg-[#c14bd6]/85 text-white"
        : isAudio
          ? "bg-[#2a2f3a] text-white"
          : "bg-[#2a2a2a] text-white";

  return (
    <div
      className={cn(
        "absolute top-1.5 flex h-[calc(100%-12px)] items-center overflow-hidden rounded-sm border text-xs select-none",
        base,
        selected ? "ring-2" : "border-border",
        dimmed && "invisible", // the dragged clip floats with the cursor; its slot shows as the open gap
        animate && "transition-[left,width] duration-150 ease-out", // neighbours slide live to make room
      )}
      style={{ left: clip.start * pxPerSec, width: w, ...(selected ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : {}) }}
      onPointerDown={onBody}
      onContextMenu={onContext}
      title={`${kind} · ${clip.duration.toFixed(1)}s`}
    >
      {kind === "image" && url ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{ backgroundImage: `url(${url})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }}
        />
      ) : kind === "video" && url ? (
        <div className="pointer-events-none absolute inset-0 flex overflow-hidden opacity-90">
          {Array.from({ length: tiles }).map((_, i) => (
            <video
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed filmstrip cells
              // biome-ignore lint/a11y/useMediaCaption: clip thumbnail frame
              key={i}
              className="h-full min-w-0 flex-1 object-cover"
              src={`${url}#t=${(clip.in + ((i + 0.5) / tiles) * span).toFixed(2)}`}
              muted
              preload="metadata"
              playsInline
            />
          ))}
        </div>
      ) : null}
      {isAudio ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-1 top-5 opacity-60"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#9aa4b2 0 1px,transparent 1px 4px)" }}
        />
      ) : null}

      <span className="pointer-events-none relative z-[1] flex items-center gap-1.5 truncate px-2 py-1">
        {kind === "text" ? <Type className="size-3 shrink-0" /> : null}
        {kind === "effect" || trackKind === "effect" ? <Blend className="size-3 shrink-0" /> : null}
        {isAudio ? <Music className="size-3 shrink-0" /> : null}
        <span className="truncate">{clip.text?.content ?? (isAudio ? "Audio" : isMedia ? "" : kind)}</span>
      </span>

      {/* trim handles: wider invisible grab area, with a small square handle flush to the border */}
      <span className="absolute inset-y-0 left-0 z-20 flex w-2.5 cursor-ew-resize items-center justify-start" onPointerDown={onTrimStart}>
        {selected ? (
          <span className="flex h-3 w-1 items-center justify-center rounded-r-[2px]" style={{ backgroundColor: ACCENT }}>
            <span className="h-1.5 w-px bg-black/60" />
          </span>
        ) : null}
      </span>
      <span className="absolute inset-y-0 right-0 z-20 flex w-2.5 cursor-ew-resize items-center justify-end" onPointerDown={onTrimEnd}>
        {selected ? (
          <span className="flex h-3 w-1 items-center justify-center rounded-l-[2px]" style={{ backgroundColor: ACCENT }}>
            <span className="h-1.5 w-px bg-black/60" />
          </span>
        ) : null}
      </span>
    </div>
  );
}
