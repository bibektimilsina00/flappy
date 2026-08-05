"use client";

import { Music, Pause, Play, Plus } from "lucide-react";
import { useRef, useState } from "react";
import type { VideoEditorAsset } from "../../types";

export function MediaGrid({
  items,
  onImport,
  importing,
  empty,
}: {
  items: VideoEditorAsset[];
  onImport: () => void;
  importing: boolean;
  empty: string;
}) {
  return (
    <div className="space-y-3 px-3">
      <button
        type="button"
        onClick={onImport}
        disabled={importing}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-[#14b8a6] hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        <Plus className="size-4" /> {importing ? "Importing…" : "Import from computer"}
      </button>
      {!items.length ? (
        <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.map((asset) => (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("asset-id", asset.id)}
              className="group relative cursor-grab overflow-hidden rounded-xl border border-border bg-secondary active:cursor-grabbing"
            >
              <MediaTileThumb asset={asset} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaTileThumb({ asset }: { asset: VideoEditorAsset }) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) void media.play();
    else media.pause();
  };

  const mediaEvents = {
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
  };

  if (asset.kind === "image") {
    // biome-ignore lint/a11y/useAltText: thumbnail
    return <img src={asset.url} className="pointer-events-none aspect-video w-full object-cover" />;
  }
  return (
    <>
      {asset.kind === "video" ? (
        // biome-ignore lint/a11y/useMediaCaption: preview asset
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={asset.url}
          className="pointer-events-none aspect-video w-full object-cover"
          playsInline
          {...mediaEvents}
        />
      ) : (
        <div className="grid aspect-video w-full place-items-center bg-secondary text-muted-foreground">
          <Music className="size-5" />
          {/* biome-ignore lint/a11y/useMediaCaption: preview asset */}
          <audio
            ref={(el) => {
              mediaRef.current = el;
            }}
            src={asset.url}
            className="hidden"
            {...mediaEvents}
          />
        </div>
      )}
      <div className="absolute inset-0 grid place-items-center">
        <button
          type="button"
          onClick={toggle}
          onMouseDown={(e) => e.stopPropagation()}
          className="grid size-9 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
          title={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4 pl-0.5" />}
        </button>
      </div>
    </>
  );
}

export function TextTile({
  preset,
  onAdd,
  wide,
}: {
  preset: { label: string; content: string; style: string };
  onAdd: (content: string) => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd(preset.content)}
      className={`group relative flex items-center justify-between rounded-xl border border-border p-3 text-left transition-colors hover:border-[#14b8a6] hover:bg-accent ${
        wide ? "w-full" : ""
      }`}
    >
      <span className={`truncate ${preset.style}`}>{preset.label}</span>
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-[#14b8a6] group-hover:text-foreground">
        <Plus className="size-3.5" />
      </span>
    </button>
  );
}
