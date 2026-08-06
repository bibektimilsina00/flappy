"use client";

import type { RefObject } from "react";
import type { Clip, VideoEditorDoc } from "../../types";
import { useCanvasSelection } from "./hooks/use-canvas-selection";

const ACCENT = "#14b8a6";

// Corner + edge drag handles. Corners are circles, edges are pills; all scale
// uniformly about the centre (the only transform the model supports).
const CORNERS = [
  { pos: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize", dx: -1, dy: -1 },
  { pos: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize", dx: 1, dy: -1 },
  { pos: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize", dx: -1, dy: 1 },
  { pos: "right-0 bottom-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize", dx: 1, dy: 1 },
];
const EDGES = [
  { pos: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize", size: "h-1.5 w-5", dx: 0, dy: -1 },
  { pos: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize", size: "h-1.5 w-5", dx: 0, dy: 1 },
  { pos: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize", size: "h-5 w-1.5", dx: -1, dy: 0 },
  { pos: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "ew-resize", size: "h-5 w-1.5", dx: 1, dy: 0 },
];

export function CanvasSelection({
  clip,
  doc,
  bw,
  bh,
  boxRef,
  startGesture,
  preview,
  endGesture,
}: {
  clip: Clip;
  doc: VideoEditorDoc;
  bw: number;
  bh: number;
  boxRef: RefObject<HTMLElement | null>;
  startGesture: () => void;
  preview: (d: VideoEditorDoc) => void;
  endGesture: (changed?: boolean) => void;
}) {
  const { onPointerDown, guides } = useCanvasSelection({ clip, doc, boxRef, startGesture, preview, endGesture });
  const t = clip.transform;
  const w = bw * t.scale;
  const h = bh * t.scale;
  const left = bw / 2 + t.x - w / 2;
  const top = bh / 2 + t.y - h / 2;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-visible">
      {guides.x !== null ? <span className="absolute top-0 bottom-0 w-px" style={{ left: guides.x, backgroundColor: ACCENT }} /> : null}
      {guides.y !== null ? <span className="absolute right-0 left-0 h-px" style={{ top: guides.y, backgroundColor: ACCENT }} /> : null}
      <div className="absolute" style={{ left, top, width: w, height: h, transform: `rotate(${t.rotation}deg)` }}>
        {/* move surface + frame */}
        <button
          type="button"
          onPointerDown={(e) => onPointerDown(e, "move")}
          className="pointer-events-auto absolute inset-0 cursor-move rounded-[2px] border-2"
          style={{ borderColor: ACCENT }}
          aria-label="Move clip"
        />
        {EDGES.map((hh) => (
          <span
            key={hh.pos}
            onPointerDown={(e) => onPointerDown(e, { dx: hh.dx, dy: hh.dy })}
            className={`pointer-events-auto absolute ${hh.pos} ${hh.size} rounded-full border border-border bg-white shadow`}
            style={{ cursor: hh.cursor }}
          />
        ))}
        {CORNERS.map((hh) => (
          <span
            key={hh.pos}
            onPointerDown={(e) => onPointerDown(e, { dx: hh.dx, dy: hh.dy })}
            className={`pointer-events-auto absolute ${hh.pos} size-3 rounded-full border-2 bg-white shadow`}
            style={{ cursor: hh.cursor, borderColor: ACCENT }}
          />
        ))}
      </div>
    </div>
  );
}
