"use client";

import { type RefObject, useRef, useState } from "react";
import { updateTransform } from "../../../lib/doc-ops";
import type { Clip, VideoEditorDoc } from "../../../types";

// A drag is either a move, or a resize from a handle in direction (dx,dy) where
// each is -1|0|1 (corner = both ±1, edge = one is 0).
type Handle = "move" | { dx: number; dy: number };
const SNAP = 7; // px — distance within which a move snaps to a guide

/**
 * Pointer-drag math for the on-canvas selection frame. Move updates transform
 * x/y and snaps to the canvas centre/edges. Resize scales uniformly while
 * keeping the OPPOSITE corner/edge pinned (adjusting x/y to compensate), so a
 * handle grows the box from its anchor rather than about the centre.
 * `guides` holds the box-space x/y of any active snap line (null when idle).
 */
export function useCanvasSelection({
  clip,
  doc,
  boxRef,
  startGesture,
  preview,
  endGesture,
}: {
  clip: Clip;
  doc: VideoEditorDoc;
  boxRef: RefObject<HTMLElement | null>;
  startGesture: () => void;
  preview: (d: VideoEditorDoc) => void;
  endGesture: (changed?: boolean) => void;
}) {
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  // keep the latest doc so mid-drag previews apply onto current state
  const docRef = useRef(doc);
  docRef.current = doc;

  const onPointerDown = (e: React.PointerEvent, handle: Handle) => {
    e.preventDefault();
    e.stopPropagation();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const bw = box.width;
    const bh = box.height;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const t0 = { ...clip.transform };

    startGesture();

    // ── move ──────────────────────────────────────────────
    if (handle === "move") {
      const hw = (bw * t0.scale) / 2;
      const hh = (bh * t0.scale) / 2;
      const xTargets = [
        [0, bw / 2],
        [hw - bw / 2, 0],
        [bw / 2 - hw, bw],
      ] as const;
      const yTargets = [
        [0, bh / 2],
        [hh - bh / 2, 0],
        [bh / 2 - hh, bh],
      ] as const;
      const snap = (val: number, targets: readonly (readonly [number, number])[]) => {
        for (const [v, line] of targets) if (Math.abs(val - v) <= SNAP) return { v, line };
        return { v: val, line: null as number | null };
      };
      const onMove = (ev: PointerEvent) => {
        const sx = snap(t0.x + (ev.clientX - x0), xTargets);
        const sy = snap(t0.y + (ev.clientY - y0), yTargets);
        preview(updateTransform(docRef.current, clip.id, { x: sx.v, y: sy.v }));
        setGuides({ x: sx.line, y: sy.line });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setGuides({ x: null, y: null });
        endGesture(true);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return;
    }

    // ── resize (anchor the opposite corner/edge) ──────────
    const { dx, dy } = handle;
    const hw0 = (bw * t0.scale) / 2;
    const hh0 = (bh * t0.scale) / 2;
    // fixed anchor = the opposite corner/edge, in box space
    const ax = bw / 2 + t0.x - dx * hw0;
    const ay = bh / 2 + t0.y - dy * hh0;

    const onMove = (ev: PointerEvent) => {
      const px = ev.clientX - box.left;
      const py = ev.clientY - box.top;
      // uniform scale that best follows the dragged axis(es) away from the anchor
      const cand: number[] = [];
      if (dx !== 0) cand.push(Math.abs(px - ax) / bw);
      if (dy !== 0) cand.push(Math.abs(py - ay) / bh);
      let scale = Math.max(0.05, ...cand);

      // snap: land the dragged handle on a canvas edge / centre line
      let gx: number | null = null;
      let gy: number | null = null;
      const handleX = () => ax + dx * bw * scale; // dragged handle position
      const handleY = () => ay + dy * bh * scale;
      let best: { axis: "x" | "y"; target: number; d: number } | null = null;
      if (dx !== 0) for (const target of [0, bw / 2, bw]) {
        const d = Math.abs(handleX() - target);
        if (d <= SNAP && (!best || d < best.d)) best = { axis: "x", target, d };
      }
      if (dy !== 0) for (const target of [0, bh / 2, bh]) {
        const d = Math.abs(handleY() - target);
        if (d <= SNAP && (!best || d < best.d)) best = { axis: "y", target, d };
      }
      if (best?.axis === "x") {
        scale = Math.max(0.05, (best.target - ax) / (dx * bw));
        gx = best.target;
      } else if (best?.axis === "y") {
        scale = Math.max(0.05, (best.target - ay) / (dy * bh));
        gy = best.target;
      }

      const cx = ax + (dx * bw * scale) / 2; // keep anchor pinned
      const cy = ay + (dy * bh * scale) / 2;
      preview(updateTransform(docRef.current, clip.id, { scale, x: cx - bw / 2, y: cy - bh / 2 }));
      setGuides({ x: gx, y: gy });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setGuides({ x: null, y: null });
      endGesture(true);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return { onPointerDown, guides };
}
