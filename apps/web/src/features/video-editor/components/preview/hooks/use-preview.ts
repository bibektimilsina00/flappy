"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Clip, Track, VideoEditorDoc } from "../../../types";

const laneOf = (kind: string) => (kind === "audio" ? "audio" : kind === "text" ? "text" : "visual");

export function usePreview(doc: VideoEditorDoc, playhead: number, playing: boolean) {
  const media = useRef<Map<string, HTMLMediaElement>>(new Map());

  // Measure available area and fit canvas within BOTH dimensions
  const previewRo = useRef<ResizeObserver | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const fitCb = useCallback((el: HTMLDivElement | null) => {
    previewRo.current?.disconnect();
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    previewRo.current = ro;
  }, []);

  const ratio = doc.width / doc.height;
  const bw = box.w && box.h ? Math.min(box.w, box.h * ratio) : 0;
  const bh = bw / ratio;

  const layers = useMemo(() => {
    const visual: { clip: Clip; z: number }[] = [];
    const audio: { clip: Clip; track: Track }[] = [];
    doc.tracks.forEach((track, z) => {
      if (track.hidden) return;
      const hit = track.clips.find((c) => playhead >= c.start && playhead < c.start + c.duration);
      if (!hit) return;
      if (laneOf(track.kind) === "audio") audio.push({ clip: hit, track });
      else visual.push({ clip: hit, z });
    });
    return { visual, audio };
  }, [doc, playhead]);

  const activeKey = [...layers.visual, ...layers.audio].map((l) => l.clip.id).join(",");
  const all = [...layers.visual.map((l) => l.clip), ...layers.audio.map((l) => l.clip)];

  // Synchronize HTML5 video & audio media elements with current playhead
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeKey subsumes clip identity
  useEffect(() => {
    for (const clip of all) {
      const el = media.current.get(clip.id);
      if (!el) continue;
      const src = Math.max(0, clip.in + (playhead - clip.start) * clip.speed);
      // audio fade in/out — mirrors render.py's afade so preview matches export
      if (clip.fadeAudio) {
        const d = Math.min(0.5, clip.duration / 2);
        const t = playhead - clip.start;
        const f = t < d ? t / d : t > clip.duration - d ? (clip.duration - t) / d : 1;
        el.volume = Math.max(0, Math.min(1, (clip.volume ?? 1) * f));
      } else {
        el.volume = Math.max(0, Math.min(1, clip.volume ?? 1));
      }
      if (playing) {
        if (Math.abs(el.currentTime - src) > 0.3) el.currentTime = src;
        el.play().catch(() => {});
      } else {
        try {
          el.currentTime = src;
        } catch {}
        el.pause();
      }
    }
    for (const [id, el] of media.current) if (!all.some((c) => c.id === id)) el.pause();
  }, [activeKey, playing, playhead]);

  const setRef = (id: string) => (el: HTMLMediaElement | null) => {
    if (el) media.current.set(id, el);
    else media.current.delete(id);
  };

  const textLayers = layers.visual.filter((l) => l.clip.kind === "text");

  return { fitCb, bw, bh, layers, textLayers, setRef };
}
