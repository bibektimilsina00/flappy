"use client";

import { ChevronDown, Monitor } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Clip, Track, VideoEditorDoc } from "../types";

const ACCENT = "#14b8a6";
const ASPECTS = [
  { label: "9:16 Shorts", w: 1080, h: 1920 },
  { label: "16:9 Video", w: 1920, h: 1080 },
  { label: "1:1 Square", w: 1080, h: 1080 },
];

const laneOf = (kind: string) => (kind === "audio" ? "audio" : kind === "text" ? "text" : "visual");

export function Preview({
  doc,
  urlOf,
  playhead,
  playing,
}: {
  doc: VideoEditorDoc;
  urlOf: (id?: string) => string | undefined;
  playhead: number;
  playing: boolean;
}) {
  const media = useRef<Map<string, HTMLMediaElement>>(new Map());

  // Measure the available area and fit the canvas within BOTH dimensions (so wide
  // ratios like 16:9 never overflow the panel).
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeKey subsumes clip identity
  useEffect(() => {
    for (const clip of all) {
      const el = media.current.get(clip.id);
      if (!el) continue;
      const src = Math.max(0, clip.in + (playhead - clip.start) * clip.speed);
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

  return (
    <div ref={fitCb} className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div
        className="relative overflow-hidden rounded-lg bg-black"
        style={bw ? { width: bw, height: bh } : { aspectRatio: `${doc.width} / ${doc.height}`, maxWidth: "100%", maxHeight: "100%" }}
      >
        {layers.visual.length === 0 ? (
          <div className="grid size-full place-items-center text-sm text-muted-foreground">Drop media on the timeline to preview</div>
        ) : (
          layers.visual
            .filter((l) => l.clip.kind !== "text")
            .map(({ clip, z }) => {
              const url = urlOf(clip.assetId);
              const t = clip.transform;
              const style = {
                zIndex: z,
                opacity: t.opacity,
                transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale}) rotate(${t.rotation}deg)`,
              } as const;
              if (clip.kind === "video" && url) {
                return (
                  // biome-ignore lint/a11y/useMediaCaption: editor preview
                  <video key={clip.id} ref={setRef(clip.id)} src={url} muted={clip.volume === 0} playsInline preload="auto" className="absolute inset-0 size-full object-contain" style={style} />
                );
              }
              return url ? (
                // biome-ignore lint/a11y/useAltText: editor preview
                <img key={clip.id} src={url} className="absolute inset-0 size-full object-contain" style={style} />
              ) : null;
            })
        )}
        {/* text as caption pill (bottom-centered) */}
        {textLayers.length ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex flex-col items-center gap-1.5 px-4">
            {textLayers.map(({ clip }) => (
              <span key={clip.id} className="rounded bg-black/70 px-3 py-1.5 text-center text-sm font-medium text-white" style={{ opacity: clip.transform.opacity }}>
                {clip.text?.content}
              </span>
            ))}
          </div>
        ) : null}
        {layers.audio.map(({ clip, track }) => {
          const url = urlOf(clip.assetId);
          return url ? (
            // biome-ignore lint/a11y/useMediaCaption: audio track
            <audio key={clip.id} ref={setRef(clip.id)} src={url} muted={track.muted} />
          ) : null;
        })}
      </div>
    </div>
  );
}

export function AspectMenu({ doc, setAspect }: { doc: VideoEditorDoc; setAspect: (w: number, h: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const current = ASPECTS.find((a) => Math.abs(doc.width / doc.height - a.w / a.h) < 0.01);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        <Monitor className="size-4 text-muted-foreground" />
        {current ? current.label : "Custom"}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-40 mb-1.5 w-44 rounded-lg border border-border bg-popover p-1 shadow-xl">
          {ASPECTS.map((a) => {
            const active = a === current;
            return (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  setAspect(a.w, a.h);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Monitor className="size-4" />
                {a.label}
                {active ? <span className="ml-auto size-1.5 rounded-full" style={{ backgroundColor: ACCENT }} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
