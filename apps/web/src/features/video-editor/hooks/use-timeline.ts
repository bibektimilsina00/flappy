"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { insertMove, trimClip } from "../lib/doc-ops";
import { docDuration } from "../lib/timeline-engine";
import { useEditorStore } from "../stores/use-editor-store";
import type { Clip, VideoEditorDoc } from "../types";

const HEADER_W = 120;

export function useTimeline(
  doc: VideoEditorDoc | null,
  startGesture: () => void,
  preview: (d: VideoEditorDoc) => void,
  endGesture: (changed?: boolean) => void,
) {
  // Use Zustand store for timeline reactive UI states
  const playhead = useEditorStore((s) => s.playhead);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const playing = useEditorStore((s) => s.playing);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const togglePlay = useEditorStore((s) => s.togglePlaying);
  const pxPerSec = useEditorStore((s) => s.pxPerSec);
  const setPxPerSec = useEditorStore((s) => s.setPxPerSec);
  const drag = useEditorStore((s) => s.drag);
  const setDrag = useEditorStore((s) => s.setDrag);
  const dragPos = useEditorStore((s) => s.dragPos);
  const setDragPos = useEditorStore((s) => s.setDragPos);
  const clipMenu = useEditorStore((s) => s.clipMenu);
  const setClipMenu = useEditorStore((s) => s.setClipMenu);

  const laneRef = useRef<HTMLButtonElement>(null);
  const scrollEl = useRef<HTMLDivElement | null>(null);
  const scrollCb = useCallback((el: HTMLDivElement | null) => {
    scrollEl.current = el;
  }, []);

  const total = useMemo(() => (doc ? Math.max(10, docDuration(doc)) : 10), [doc]);
  const laneW = useMemo(() => Math.max(1200 - HEADER_W, Math.ceil(total * pxPerSec) + 300), [total, pxPerSec]);
  const tickCount = useMemo(() => Math.ceil(laneW / pxPerSec) + 1, [laneW, pxPerSec]);

  // Active RAF playing loop
  const totalRef = useRef(total);
  totalRef.current = total;
  useEffect(() => {
    if (!playing) return;
    let raf: number;
    let prev = performance.now();
    const tick = (now: number) => {
      const delta = (now - prev) / 1000;
      prev = now;
      setPlayhead((p) => {
        const next = p + delta;
        if (next >= totalRef.current) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, setPlayhead, setPlaying]);

  const snapPoints = useMemo(() => {
    if (!doc) return [0];
    const pts = [0];
    for (const t of doc.tracks) for (const c of t.clips) if (c.id !== drag?.clipId) pts.push(c.start, c.start + c.duration);
    return pts;
  }, [doc, drag?.clipId]);

  const snap = useCallback(
    (t: number, thresholdPx = 7) => {
      const thr = thresholdPx / pxPerSec;
      let best = t;
      let bd = thr;
      for (const p of snapPoints) {
        const d = Math.abs(p - t);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      return best;
    },
    [snapPoints, pxPerSec],
  );

  const xToTime = useCallback(
    (clientX: number) => {
      if (!laneRef.current) return 0;
      const r = laneRef.current.getBoundingClientRect();
      return Math.max(0, (clientX - r.left) / pxPerSec);
    },
    [pxPerSec],
  );

  // Global mousemove/mouseup listener for timeline gestures
  const dragRef = useRef(drag);
  dragRef.current = drag;
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      if (!doc || !dragRef.current) return;
      const cur = dragRef.current;
      setDragPos({ x: e.clientX, y: e.clientY });

      if (cur.kind === "playhead") {
        setPlayhead(Math.min(total, xToTime(e.clientX)));
        return;
      }
      if (!cur.clipId) return;

      if (cur.kind === "move") {
        const t = snap(xToTime(e.clientX - (cur.grab?.dx ?? 0)));
        const targetRow = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-track-id]");
        const targetTrackId = targetRow?.getAttribute("data-track-id") ?? cur.trackId;
        preview(insertMove(doc, cur.clipId, t, targetTrackId ?? undefined));
      } else if (cur.kind === "trim-start") {
        const delta = xToTime(e.clientX) - (cur.startPx ?? 0);
        preview(trimClip(doc, cur.clipId, "start", delta));
      } else if (cur.kind === "trim-end") {
        const delta = xToTime(e.clientX) - (cur.startPx ?? 0);
        preview(trimClip(doc, cur.clipId, "end", delta));
      }
    };

    const onUp = () => {
      if (dragRef.current && dragRef.current.kind !== "playhead") endGesture(true);
      setDrag(null);
      setDragPos(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, doc, total, xToTime, snap, preview, endGesture, setDrag, setDragPos, setPlayhead]);

  return {
    playhead,
    setPlayhead,
    playing,
    setPlaying,
    togglePlay,
    pxPerSec,
    setPxPerSec,
    viewportW: 1200,
    laneW,
    tickCount,
    total,
    drag,
    setDrag,
    dragPos,
    setDragPos,
    clipMenu,
    setClipMenu,
    laneRef,
    scrollCb,
    xToTime,
    snap,
  };
}
