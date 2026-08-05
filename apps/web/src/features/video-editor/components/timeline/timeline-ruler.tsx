"use client";

import type React from "react";

const HEADER_W = 120;
const RULER_H = 26;

function formatTickLabel(sec: number): string {
  if (sec === 0) return "0s";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m${s}s`;
}

export function TimelineRuler({
  laneW,
  pxPerSec,
  tickCount,
  laneRef,
  onRulerPointerDown,
}: {
  laneW: number;
  pxPerSec: number;
  tickCount: number;
  laneRef: React.RefObject<HTMLButtonElement | null>;
  onRulerPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex" style={{ height: RULER_H }}>
      <div className="sticky left-0 z-40 shrink-0 border-b border-r border-border bg-card" style={{ width: HEADER_W }} />
      <button
        type="button"
        ref={laneRef}
        className="relative flex shrink-0 items-end border-b border-border bg-card text-left text-[10px] text-muted-foreground select-none"
        style={{ width: laneW, height: RULER_H }}
        onPointerDown={onRulerPointerDown}
      >
        {Array.from({ length: tickCount }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed ruler ticks
          <span key={i} className="relative flex shrink-0 items-end" style={{ width: pxPerSec, height: RULER_H }}>
            <span className="absolute left-1 top-0.5 text-[10px] font-medium text-muted-foreground/80">{formatTickLabel(i)}</span>
            <span className="absolute bottom-0 left-0 h-2 w-px bg-white/20" />
            {[1, 2, 3, 4].map((k) => (
              <span key={k} className="absolute bottom-0 h-1 w-px bg-muted" style={{ left: (pxPerSec * k) / 5 }} />
            ))}
          </span>
        ))}
      </button>
    </div>
  );
}
