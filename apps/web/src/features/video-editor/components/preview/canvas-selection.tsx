"use client";

import { type RefObject, useLayoutEffect, useState } from "react";
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
  const t = clip.transform;

  // A text clip only fills its content, not the canvas. Measure the rendered text
  // and hug it with a little breathing room so the frame sits just off the glyphs.
  const isText = clip.kind === "text";
  const [textBox, setTextBox] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    if (!isText) return setTextBox(null);
    const el = boxRef.current?.querySelector(`[data-clip="${clip.id}"]`) as HTMLElement | null;
    if (el) setTextBox({ w: el.offsetWidth, h: el.offsetHeight });
  }, [isText, clip.id, clip.text?.content, clip.text?.fontSize, clip.text?.letterSpacing, clip.text?.lineHeight, bw, boxRef]);

  const PAD_X = 48; // horizontal breathing room around the text
  const PAD_Y = 16; // vertical breathing room
  const baseW = isText && textBox ? textBox.w + PAD_X * 2 : bw;
  const baseH = isText && textBox ? textBox.h + PAD_Y : bh;
  const { onPointerDown, guides } = useCanvasSelection({ clip, doc, boxRef, baseW, baseH, startGesture, preview, endGesture });
  const w = baseW * t.scale;
  const h = baseH * t.scale;
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
        {/* text is a single row — drop the top/bottom centre edge handles, keep the corners */}
        {EDGES.filter((hh) => !(isText && hh.dy !== 0)).map((hh) => (
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
