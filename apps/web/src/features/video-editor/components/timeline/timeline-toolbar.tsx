"use client";

import { FastForward, Pause, Play, Rewind, Scissors, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";

function tc(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(m)}:${sec.padStart(4, "0")}`;
}

export function TimelineToolbar({
  hasSelection,
  playing,
  playhead,
  duration,
  pxPerSec,
  onSplit,
  onJumpStart,
  onTogglePlay,
  onJumpEnd,
  onZoomOut,
  onZoomIn,
  onZoomChange,
  onFit,
}: {
  hasSelection: boolean;
  playing: boolean;
  playhead: number;
  duration: number;
  pxPerSec: number;
  onSplit: () => void;
  onJumpStart: () => void;
  onTogglePlay: () => void;
  onJumpEnd: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onZoomChange: (px: number) => void;
  onFit: () => void;
}) {
  return (
    <div className="flex items-center border-b border-border px-3 py-2 text-sm select-none">
      <div className="flex flex-1 items-center">
        <button
          type="button"
          onClick={onSplit}
          disabled={!hasSelection}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          title="Split (S)"
        >
          <Scissors className="size-4" /> Split
        </button>
      </div>

      {/* playback */}
      <div className="flex items-center gap-2">
        <IconBtn title="Jump to start" onClick={onJumpStart}>
          <Rewind className="size-4" />
        </IconBtn>
        <button
          type="button"
          onClick={onTogglePlay}
          className="grid size-9 place-items-center rounded-full border border-border transition-colors hover:bg-accent"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4 pl-0.5" />}
        </button>
        <IconBtn title="Jump to end" onClick={onJumpEnd}>
          <FastForward className="size-4" />
        </IconBtn>
        <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">
          {tc(playhead)} <span className="text-muted-foreground/50">/ {tc(duration)}</span>
        </span>
      </div>

      {/* zoom + fit */}
      <div className="flex flex-1 items-center justify-end gap-1.5 text-muted-foreground">
        <IconBtn title="Zoom out" onClick={onZoomOut}>
          <ZoomOut className="size-4" />
        </IconBtn>
        <input
          type="range"
          min={12}
          max={200}
          value={pxPerSec}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="h-1 w-24 accent-[#14b8a6]"
        />
        <IconBtn title="Zoom in" onClick={onZoomIn}>
          <ZoomIn className="size-4" />
        </IconBtn>
        <button
          type="button"
          onClick={onFit}
          className="rounded-md px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
          title="Fit timeline"
        >
          Fit
        </button>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
