"use client";

import { ChevronDown, Monitor, Smartphone } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Clip, VideoEditorDoc } from "../../types";
import { ASPECT_PRESETS, RATIO_PRESETS, RatioIcon, resolveAspect } from "./aspect-presets";
import { CanvasSelection } from "./canvas-selection";
import { usePreview } from "./hooks/use-preview";
import { type OverlayKind, PlatformOverlay } from "./platform-overlays";

const ACCENT = "#14b8a6";

export function Preview({
  doc,
  urlOf,
  playhead,
  playing,
  overlay,
  selectedClip,
  startGesture,
  preview,
  endGesture,
}: {
  doc: VideoEditorDoc;
  urlOf: (id?: string) => string | undefined;
  playhead: number;
  playing: boolean;
  overlay?: OverlayKind;
  selectedClip?: Clip | null;
  startGesture?: () => void;
  preview?: (d: VideoEditorDoc) => void;
  endGesture?: (changed?: boolean) => void;
}) {
  const { fitCb, bw, bh, layers, textLayers, setRef } = usePreview(doc, playhead, playing);
  const boxRef = useRef<HTMLDivElement>(null);
  const editable = selectedClip && selectedClip.kind !== "audio" && startGesture && preview && endGesture;

  return (
    <div ref={fitCb} className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div
        ref={boxRef}
        className="relative"
        style={bw ? { width: bw, height: bh } : { aspectRatio: `${doc.width} / ${doc.height}`, maxWidth: "100%", maxHeight: "100%" }}
      >
        {/* clipped content layer — handles below overflow it, so they must sit outside this */}
        <div className="absolute inset-0 overflow-hidden rounded-lg" style={{ backgroundColor: doc.background || "#000000" }}>
        {layers.visual.length === 0 ? null : (
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

        {overlay ? <PlatformOverlay kind={overlay} /> : null}
        </div>

        {editable && bw ? (
          <CanvasSelection
            clip={selectedClip}
            doc={doc}
            bw={bw}
            bh={bh}
            boxRef={boxRef}
            startGesture={startGesture}
            preview={preview}
            endGesture={endGesture}
          />
        ) : null}
      </div>
    </div>
  );
}

export function AspectMenu({
  doc,
  selectedKey,
  onSelect,
  showOverlay,
  onToggleOverlay,
}: {
  doc: VideoEditorDoc;
  selectedKey: string | null;
  onSelect: (key: string, w: number, h: number) => void;
  showOverlay: boolean;
  onToggleOverlay: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const ratio = doc.width / doc.height;
  const sel = resolveAspect(selectedKey, ratio);
  const defaultActiveKey = sel?.key ?? null;

  const pick = (key: string, w: number, h: number) => {
    onSelect(key, w, h);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        {sel ? <sel.Icon className="size-4 shrink-0 overflow-visible" /> : <Monitor className="size-4 text-muted-foreground" />}
        <span className="max-w-[10rem] truncate">{sel ? (sel.isPlatform ? sel.name : sel.ratio) : "Custom"}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-40 mb-1.5 flex max-h-96 w-72 flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          <div className="min-h-0 flex-1 overflow-y-auto p-1 [scrollbar-width:thin]">
            <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Social media</p>
            {ASPECT_PRESETS.map((p) => (
              <AspectItem
                key={p.key}
                active={defaultActiveKey === p.key}
                onClick={() => pick(p.key, p.w, p.h)}
                icon={<p.Icon className="size-4 shrink-0 overflow-visible" />}
                label={p.platform}
                ratio={p.ratio}
              />
            ))}
            <div className="my-1 border-t border-border" />
            <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Custom</p>
            {RATIO_PRESETS.map((p) => {
              const key = `custom ${p.ratio}`;
              return (
                <AspectItem
                  key={key}
                  active={defaultActiveKey === key}
                  onClick={() => pick(key, p.w, p.h)}
                  icon={<RatioIcon w={p.w} h={p.h} className="size-4 shrink-0 text-muted-foreground" />}
                  label={p.label}
                  ratio={p.ratio}
                />
              );
            })}
          </div>

          {/* platform safe-zone overlay toggle — only for presets that have one */}
          {sel?.overlay ? (
            <button
              type="button"
              onClick={onToggleOverlay}
              className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <Smartphone className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-left">Show {sel.name} Overlay</span>
              <span className={cn("flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors", showOverlay ? "bg-[#14b8a6]" : "bg-border")}>
                <span className={cn("size-4 rounded-full bg-white shadow-sm transition-transform", showOverlay ? "translate-x-4" : "translate-x-0")} />
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AspectItem({ active, onClick, icon, label, ratio }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; ratio: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent", active && "bg-accent")}
    >
      {icon}
      <span className="truncate text-sm font-medium text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground">({ratio})</span>
      {active ? <span className="ml-auto size-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} /> : null}
    </button>
  );
}

// Swatch palette (neutrals + brights + pastels), mirroring the reference picker.
const BG_PALETTE = [
  "#000000", "#5d647b", "#9094a5", "#bfc1ce", "#dfe0e5", "#eeeef0", "#ffffff", "#ff4f4a",
  "#ff7434", "#ffe069", "#4ea552", "#2d8eff", "#5456ff", "#8253f9", "#ff69b1", "#ffa7a4",
  "#ffba9a", "#fff0b4", "#a6d2a8", "#96c6ff", "#a9aaff", "#c1a9fc", "#ffb4d8", "#ffcac9",
  "#ffd5c2", "#fff6d2", "#cae4cb", "#c0ddff", "#ccccff", "#d9cbfd", "#ffd2e8",
];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function BackgroundMenu({ doc, onChange }: { doc: VideoEditorDoc; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"color" | "image">("color");
  const ref = useRef<HTMLDivElement>(null);
  const current = doc.background || "#000000";
  const [hex, setHex] = useState(current);
  useEffect(() => setHex(current), [current]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        <span className="size-4 rounded-full border border-border" style={{ backgroundColor: current }} />
        Background
      </button>
      {open ? (
        <div className="absolute bottom-full left-1/2 z-40 mb-1.5 w-64 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 shadow-xl">
          <div className="mb-3 flex gap-1 rounded-lg bg-secondary p-0.5 text-xs font-medium">
            {(["color", "image"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn("flex-1 rounded-md py-1 capitalize transition-colors", tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "color" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {/* native picker (opens OS color wheel) */}
                <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border">
                  <span className="block size-full" style={{ backgroundColor: current }} />
                  <input
                    type="color"
                    value={HEX_RE.test(current) ? current : "#000000"}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Pick background color"
                  />
                </label>
                <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5">
                  <span className="text-xs text-muted-foreground">Hex</span>
                  <input
                    value={hex}
                    spellCheck={false}
                    onChange={(e) => {
                      setHex(e.target.value);
                      const v = e.target.value.trim();
                      if (HEX_RE.test(v)) onChange(v);
                    }}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-8 gap-1.5">
                {BG_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    title={c}
                    className={cn(
                      "aspect-square rounded-md border transition-transform hover:scale-110",
                      current.toLowerCase() === c.toLowerCase() ? "ring-2 ring-[#14b8a6] ring-offset-1 ring-offset-popover" : "border-border",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">Image backgrounds — coming soon.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
