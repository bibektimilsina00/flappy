"use client";

import {
  AudioLines,
  Blend,
  Clapperboard,
  Component,
  Crop,
  Eye,
  Film,
  Folder,
  History,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Pause,
  Play,
  Plus,
  Scissors,
  Search,
  Shapes,
  Sparkles,
  Type,
  Upload,
  Video,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { unsplash } from "./media";

/**
 * Interactive product mock: a live mini app with the real Canvas / Editor /
 * Clips tabs. Canvas nodes mirror the app's NodeShell (grey smooth-step wires
 * to real ports) and are draggable, with the node rail on the side. Editor
 * and Clips are faithful mocks. Self-contained (marketing tokens only).
 */

const PROMPTS = [
  "Drone shot over neon Tokyo at night, cinematic, volumetric fog",
  "Slow push-in on a rain-slick Seoul alley, moody, 24fps",
  "Golden-hour sweep across Himalayan peaks, epic wide shot",
];
const AUDIO_PROMPTS = [
  "Lo-fi hip-hop beat, mellow keys, vinyl crackle, 80 BPM",
  "Cinematic orchestral swell, tense strings, deep taiko drums",
  "Warm ambient synth pad, dreamy, slow fade-in",
];
const IMG = unsplash("1540959733332-eab4deabeeaf", 480);
const IMG2 = unsplash("1492691527719-9d1e07e534b4", 360);
const VIDEO = "https://videos.pexels.com/video-files/2098989/2098989-hd_1920_1080_30fps.mp4";

// Match the app's canvas edges: a single port sits 28px down; wires are grey
// smooth-step (rounded right angles), like getSmoothStepPath.
const PORT_TOP = 28;
const EDGE_STROKE = "rgba(138,138,138,0.55)";

function smoothStep(sx: number, sy: number, tx: number, ty: number, r = 12): string {
  if (Math.abs(sy - ty) < 0.5) return `M ${sx} ${sy} L ${tx} ${ty}`;
  const midX = (sx + tx) / 2;
  const rr = Math.max(0, Math.min(r, Math.abs(midX - sx), Math.abs(midX - tx), Math.abs(ty - sy) / 2));
  const dir = ty > sy ? 1 : -1;
  return `M ${sx} ${sy} L ${midX - rr} ${sy} Q ${midX} ${sy} ${midX} ${sy + dir * rr} L ${midX} ${ty - dir * rr} Q ${midX} ${ty} ${midX + rr} ${ty} L ${tx} ${ty}`;
}

type View = "canvas" | "editor" | "clips";
const CHROME: Record<View, string> = { canvas: "Canvas", editor: "Editor", clips: "Clips" };

export function ProductMock({ className }: { className?: string }) {
  const [view, setView] = useState<View>("canvas");

  return (
    <div className={cn("w-full select-none overflow-hidden rounded-2xl border border-mk-border bg-mk-surface", className)}>
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-mk-border bg-mk-surface2 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <div className="ml-3 flex items-center gap-1 rounded-md bg-mk-bg px-2 py-1 text-[11px] text-mk-faint">
          <Component className="size-3 text-mk-accent" /> Untitled project · {CHROME[view]}
        </div>
      </div>

      {/* active view */}
      <div className="relative h-[480px] bg-mk-bg sm:h-[580px]">
        {view === "canvas" ? <CanvasView /> : view === "editor" ? <EditorView /> : <ClipsView />}
      </div>

      {/* bottom tabs — Canvas ⇄ Editor ⇄ Clips */}
      <div className="flex items-stretch border-t border-mk-border bg-mk-surface2 text-[13px]">
        {(
          [
            { id: "canvas", label: "Canvas", Icon: Component },
            { id: "editor", label: "Editor", Icon: Clapperboard },
            { id: "clips", label: "Clips", Icon: Scissors },
          ] as const
        ).map(({ id, label, Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                "flex items-center gap-2 border-r border-mk-border px-4 py-2 font-medium transition-colors last:border-r-0",
                active ? "bg-mk-bg text-mk-fg" : "text-mk-muted hover:bg-white/5 hover:text-mk-fg",
              )}
            >
              <Icon className="size-4 shrink-0" style={active ? { color: "#14b8a6" } : undefined} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── Canvas view ─────────────────────────── */

type Kind = "text" | "image" | "video" | "audio";
const KIND: Record<Kind, { title: string; Icon: typeof Type; inputs: number; flush: boolean; w: number; boxH: number }> = {
  text: { title: "Text", Icon: Type, inputs: 1, flush: false, w: 202, boxH: 92 },
  image: { title: "Image", Icon: ImageIcon, inputs: 2, flush: true, w: 168, boxH: 118 },
  audio: { title: "Audio", Icon: AudioLines, inputs: 1, flush: false, w: 182, boxH: 56 },
  video: { title: "Video", Icon: Video, inputs: 3, flush: true, w: 208, boxH: 130 },
};
const HEADER = 24;
const totalH = (k: Kind) => HEADER + KIND[k].boxH;

type MockNode = { id: string; kind: Kind; media?: string };
const NODES: (MockNode & { fx: number; fy: number })[] = [
  { id: "text1", kind: "text", fx: 0.11, fy: 0.16 },
  { id: "text2", kind: "text", fx: 0.11, fy: 0.68 },
  { id: "imgA", kind: "image", fx: 0.35, fy: 0.02, media: IMG },
  { id: "imgB", kind: "image", fx: 0.35, fy: 0.36, media: IMG2 },
  { id: "audio", kind: "audio", fx: 0.37, fy: 0.76 },
  { id: "video", kind: "video", fx: 0.7, fy: 0.22 },
];
// text1 → both images; text2 → audio; both images + audio → video (3 input ports)
const EDGES: { from: string; to: string; port: number }[] = [
  { from: "text1", to: "imgA", port: 0 },
  { from: "text1", to: "imgB", port: 0 },
  { from: "text2", to: "audio", port: 0 },
  { from: "imgA", to: "video", port: 0 },
  { from: "imgB", to: "video", port: 1 },
  { from: "audio", to: "video", port: 2 },
];
const KIND_OF = Object.fromEntries(NODES.map((n) => [n.id, n.kind])) as Record<string, Kind>;

// the app's node rail (CanvasToolbar): node kinds (clickable → spawn) + tools
const RAIL: ({ Icon: typeof Type; label: string; kind?: Kind } | { divider: true })[] = [
  { Icon: Type, label: "Text", kind: "text" },
  { Icon: ImageIcon, label: "Image", kind: "image" },
  { Icon: Video, label: "Video", kind: "video" },
  { Icon: AudioLines, label: "Audio", kind: "audio" },
  { Icon: Upload, label: "Upload files" },
  { Icon: Shapes, label: "Stickers" },
  { divider: true },
  { Icon: Folder, label: "Library" },
  { divider: true },
  { Icon: History, label: "Generations" },
];

function CanvasView() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 560 });
  const [pos, setPos] = useState<Record<string, { fx: number; fy: number }>>(
    Object.fromEntries(NODES.map((n) => [n.id, { fx: n.fx, fy: n.fy }])),
  );
  const drag = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  // nodes spawned by clicking the rail — appear, linger ~3s, then fade out
  const [spawned, setSpawned] = useState<
    { key: number; kind: Kind; fx: number; fy: number; out: boolean; media?: string }[]
  >([]);
  const spawnSeq = useRef(0);
  const spawn = (kind: Kind) => {
    const key = ++spawnSeq.current;
    const fx = 0.28 + Math.random() * 0.34;
    const fy = 0.12 + Math.random() * 0.5;
    const media = kind === "image" ? (key % 2 ? IMG : IMG2) : undefined;
    setSpawned((s) => [...s, { key, kind, fx, fy, out: false, media }]);
    window.setTimeout(() => {
      setSpawned((s) => s.map((n) => (n.key === key ? { ...n, out: true } : n)));
      window.setTimeout(() => setSpawned((s) => s.filter((n) => n.key !== key)), 320);
    }, 3000);
  };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const el = canvasRef.current;
      if (!d || !el) return;
      const r = el.getBoundingClientRect();
      const k = KIND_OF[d.id];
      const x = Math.max(6, Math.min(r.width - KIND[k].w - 6, e.clientX - r.left - d.ox));
      const y = Math.max(6, Math.min(r.height - totalH(k) - 6, e.clientY - r.top - d.oy));
      setPos((p) => ({ ...p, [d.id]: { fx: x / r.width, fy: y / r.height } }));
    };
    const up = () => {
      drag.current = null;
      setDragging(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging]);

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    const el = canvasRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { id, ox: e.clientX - r.left - pos[id].fx * r.width, oy: e.clientY - r.top - pos[id].fy * r.height };
    setDragging(id);
  };

  const px = (id: string) => ({ x: pos[id].fx * size.w, y: pos[id].fy * size.h });
  const portY = (id: string, isOutput: boolean, index: number) => {
    const k = KIND_OF[id];
    const boxTop = px(id).y + HEADER;
    const count = isOutput ? 1 : KIND[k].inputs;
    return count === 1 ? boxTop + PORT_TOP : boxTop + (KIND[k].boxH * (index + 1)) / (count + 1);
  };
  const wire = (from: string, to: string, port: number) =>
    smoothStep(px(from).x + KIND[KIND_OF[from]].w, portY(from, true, 0), px(to).x, portY(to, false, port), 12);

  return (
    <div ref={canvasRef} className="relative size-full mk-bg-grid">
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        {EDGES.map((e) => (
          <path key={`${e.from}-${e.to}-${e.port}`} d={wire(e.from, e.to, e.port)} fill="none" stroke={EDGE_STROKE} strokeWidth={2} />
        ))}
      </svg>

      {NODES.map((n) => (
        <NodeCard key={n.id} node={n} p={px(n.id)} active={dragging === n.id} onDrag={startDrag(n.id)} />
      ))}
      {spawned.map((n) => (
        <NodeCard
          key={n.key}
          node={{ id: `spawn-${n.key}`, kind: n.kind, media: n.media }}
          p={{ x: n.fx * size.w, y: n.fy * size.h }}
          anim={n.out ? "out" : "in"}
        />
      ))}

      {/* node rail — mirrors the app's CanvasToolbar (left side); click a node to add it */}
      <div className="absolute left-4 top-1/2 z-40 -translate-y-1/2">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-mk-border bg-mk-surface p-2 shadow-xl">
          {RAIL.map((item, i) =>
            "divider" in item ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed dividers
              <div key={i} className="my-1 h-px w-6 bg-mk-border" />
            ) : (
              <RailButton
                key={item.label}
                Icon={item.Icon}
                label={item.label}
                onClick={item.kind ? () => spawn(item.kind as Kind) : undefined}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function RailButton({ Icon, label, onClick }: { Icon: typeof Type; label: string; onClick?: () => void }) {
  return (
    <div className="group/tt relative">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="grid size-9 place-items-center rounded-lg text-mk-muted transition-colors hover:bg-white/10 hover:text-mk-fg active:scale-95"
      >
        <Icon className="size-[18px]" />
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-mk-border bg-mk-surface2 px-2 py-1 text-xs text-mk-fg opacity-0 shadow-md transition-opacity group-hover/tt:opacity-100">
        {label}
      </span>
    </div>
  );
}

function NodeCard({
  node,
  p,
  active,
  onDrag,
  anim,
}: {
  node: MockNode;
  p: { x: number; y: number };
  active?: boolean;
  onDrag?: (e: React.PointerEvent) => void;
  anim?: "in" | "out";
}) {
  const { Icon, title, inputs, flush, w, boxH } = KIND[node.kind];
  return (
    <div
      onPointerDown={anim ? undefined : onDrag}
      style={{ left: p.x, top: p.y, width: w, touchAction: "none" }}
      className={cn(
        "absolute",
        anim === "in"
          ? "z-30 animate-in fade-in-0 zoom-in-95 duration-300"
          : anim === "out"
            ? "z-30 animate-out fade-out-0 zoom-out-95 duration-300"
            : active
              ? "z-20 cursor-grabbing"
              : "z-10 cursor-grab",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[12px] font-medium text-mk-fg">
        <Icon className="size-3.5 shrink-0 text-mk-muted" />
        <span className="truncate">{title}</span>
      </div>
      <div
        style={{ height: boxH }}
        className={cn(
          "relative rounded-lg border bg-mk-surface transition-[border-color,box-shadow]",
          active ? "border-white/60 shadow-2xl shadow-black/50" : "border-mk-border shadow-lg",
        )}
      >
        {flush ? (
          <div className="size-full overflow-hidden rounded-[7px]">
            <NodeBody node={node} />
          </div>
        ) : (
          <div className="size-full overflow-hidden p-3">
            <NodeBody node={node} />
          </div>
        )}
        {Array.from({ length: inputs }).map((_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative ports
            key={i}
            style={{ top: inputs === 1 ? PORT_TOP : `${((i + 1) * 100) / (inputs + 1)}%` }}
            className="absolute -left-[6px] h-[16px] w-[5px] -translate-y-1/2 rounded-l-[3px] bg-mk-muted/50"
          />
        ))}
        <span style={{ top: PORT_TOP }} className="absolute -right-[6px] h-[16px] w-[5px] -translate-y-1/2 rounded-r-[3px] bg-mk-muted/50" />
      </div>
    </div>
  );
}

function NodeBody({ node }: { node: MockNode }) {
  if (node.kind === "text") return <Typewriter prompts={node.id === "text2" ? AUDIO_PROMPTS : PROMPTS} />;
  if (node.kind === "audio") return <Waveform />;
  if (node.kind === "image") {
    return (
      <div className="relative size-full">
        {/* biome-ignore lint/nursery/noImgElement: marketing static image */}
        {/* biome-ignore lint/a11y/useAltText: decorative */}
        <img src={node.media} alt="" draggable={false} className="size-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.35),transparent_55%)]" />
      </div>
    );
  }
  return (
    <div className="relative size-full bg-mk-surface2">
      {/* biome-ignore lint/a11y/useMediaCaption: decorative */}
      <video src={VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.4),transparent_50%)]" />
      <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-px text-[8px] font-medium text-white backdrop-blur">1080p</span>
    </div>
  );
}

const WAVE = [7, 13, 9, 17, 11, 20, 8, 15, 10, 18, 7, 14, 9, 16, 8, 12, 10, 6, 13, 9];
function Waveform() {
  return (
    <div className="flex size-full items-center gap-[3px]">
      {WAVE.map((h, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative bars
          key={i}
          style={{ height: h }}
          className="w-[3px] shrink-0 rounded-full bg-mk-accent/70"
        />
      ))}
    </div>
  );
}

function Typewriter({ prompts }: { prompts: string[] }) {
  const [text, setText] = useState(prompts[0]);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let pi = 0;
    let ci = prompts[0].length;
    let deleting = true;
    let timer = window.setTimeout(step, 1600);
    function step() {
      const full = prompts[pi];
      ci += deleting ? -1 : 1;
      setText(full.slice(0, ci));
      let delay = deleting ? 24 : 52;
      if (!deleting && ci >= full.length) {
        deleting = true;
        delay = 1600;
      } else if (deleting && ci <= 0) {
        deleting = false;
        pi = (pi + 1) % prompts.length;
        delay = 320;
      }
      timer = window.setTimeout(step, delay);
    }
    return () => clearTimeout(timer);
  }, [prompts]);
  return (
    <p className="text-[12px] leading-relaxed text-mk-muted">
      {text}
      <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-mk-accent align-middle" />
    </p>
  );
}

/* ─────────────────────────── Editor view ─────────────────────────── */

const ED_HEADER = 96; // track label column
const ED_TRACK = 40;
const ED_RULER = 22;
const LEFT_ED_TABS = [
  { label: "Media", Icon: Play },
  { label: "Text", Icon: Type },
  { label: "Effects", Icon: Blend },
  { label: "Transitions", Icon: Film },
] as const;
const AI_ED_TABS = [
  { label: "Assistant", Icon: Sparkles },
  { label: "Image", Icon: ImageIcon },
  { label: "Video", Icon: Film },
] as const;
const ASSIST_SUGGESTIONS = [
  "a drone shot flying over neon Tokyo at night",
  "a cute corgi running on the beach, slow motion",
  "product photo of a matte black bottle on marble",
];
const MEDIA_ITEMS: { media: string; kind: string }[] = [
  { media: "video", kind: "video" },
  { media: IMG, kind: "image" },
  { media: IMG2, kind: "image" },
  { media: IMG, kind: "image" },
];

function EditorView() {
  const [leftTab, setLeftTab] = useState("Media");
  const [rightTab, setRightTab] = useState("Assistant");
  return (
    <div className="flex size-full flex-col bg-mk-bg text-[11px]">
      {/* panels: Media | Preview | AI */}
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        {/* left — Media */}
        <aside className="flex w-44 shrink-0 flex-col overflow-hidden rounded-lg border border-mk-border bg-mk-surface">
          <div className="flex items-center gap-0.5 overflow-hidden border-b border-mk-border px-1.5 pt-1.5">
            {LEFT_ED_TABS.map((t) => (
              <EdTabBtn key={t.label} active={leftTab === t.label} onClick={() => setLeftTab(t.label)} Icon={t.Icon} label={t.label} />
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
            {leftTab === "Media" ? <MediaPanelMock /> : <p className="px-1 py-3 text-mk-muted">{leftTab} — coming soon.</p>}
          </div>
        </aside>

        {/* center — preview */}
        <main className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-mk-border bg-mk-surface p-3">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="relative max-h-full overflow-hidden rounded-md border border-mk-border shadow-xl" style={{ aspectRatio: "16 / 9" }}>
              {/* biome-ignore lint/a11y/useMediaCaption: decorative */}
              <video src={VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.3),transparent_55%)]" />
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="rounded-md border border-mk-border px-2 py-0.5 tabular-nums text-mk-muted">
              00:12 <span style={{ color: "#14b8a6" }}>/ 00:30</span>
            </span>
            <button type="button" className="grid size-8 place-items-center rounded-full border border-mk-border text-mk-fg">
              <Pause className="size-4" />
            </button>
            <div className="flex items-center gap-1.5 text-mk-muted">
              <Crop className="size-4" />
              <Maximize2 className="size-4" />
            </div>
          </div>
        </main>

        {/* right — AI */}
        <aside className="flex w-48 shrink-0 flex-col overflow-hidden rounded-lg border border-mk-border bg-mk-surface">
          <div className="flex items-center gap-0.5 border-b border-mk-border px-1.5 pt-1.5">
            {AI_ED_TABS.map((t) => (
              <EdTabBtn key={t.label} active={rightTab === t.label} onClick={() => setRightTab(t.label)} Icon={t.Icon} label={t.label} />
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5 [scrollbar-width:thin]">
            <textarea
              readOnly
              placeholder={rightTab === "Image" ? "Describe the image…" : "Describe the video…"}
              className="h-14 w-full resize-none rounded-md border border-mk-border bg-mk-surface2 p-2 text-[11px] text-mk-muted outline-none placeholder:text-mk-faint"
            />
            <div className="flex flex-wrap gap-1.5">
              {ASSIST_SUGGESTIONS.map((s) => (
                <span key={s} className="rounded-full border border-mk-border px-2 py-1 text-[9px] leading-tight text-mk-muted">
                  {s}
                </span>
              ))}
            </div>
            <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-md bg-mk-accent py-2 text-[12px] font-semibold text-mk-accentfg">
              <Sparkles className="size-3.5" /> Generate
            </button>
          </div>
        </aside>
      </div>

      {/* timeline */}
      <div className="relative shrink-0 select-none border-t border-mk-border bg-mk-surface">
        {/* ruler */}
        <div className="flex" style={{ height: ED_RULER }}>
          <div className="shrink-0 border-r border-mk-border" style={{ width: ED_HEADER }} />
          <div className="relative flex-1 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed ruler ticks
                key={i}
                className="absolute inset-y-0"
                style={{ left: `${(i / 6) * 100}%` }}
              >
                <span className="absolute left-1 top-0.5 text-[8px] text-mk-faint">{String(i * 5).padStart(2, "0")}.00</span>
                <span className="absolute bottom-0 left-0 h-2 w-px bg-white/15" />
              </div>
            ))}
          </div>
        </div>

        {/* tracks */}
        <EdTrack>
          <EdClip left="0%" w="34%" label="shot 01" media={IMG} />
          <EdClip left="34%" w="30%" label="shot 02" media={IMG2} />
          <EdClip left="64%" w="36%" label="shot 03" media={IMG} />
        </EdTrack>
        <EdTrack>
          <EdClip left="10%" w="45%" label="captions" kind="text" />
        </EdTrack>
        <EdTrack>
          <EdClip left="0%" w="100%" label="music" kind="audio" />
        </EdTrack>

        {/* playhead — sweeps only over the lane area (right of the header) */}
        <div className="pointer-events-none absolute inset-y-0 z-20" style={{ left: ED_HEADER, right: 0 }}>
          <div className="mk-sweep absolute inset-y-0 w-px bg-mk-accent">
            <span className="absolute -left-[3px] top-0 size-1.5 rounded-sm bg-mk-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EdTabBtn({ active, onClick, Icon, label }: { active: boolean; onClick: () => void; Icon: typeof Type; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 border-b-2 px-1.5 pb-1.5 text-[11px] transition-colors",
        active ? "border-mk-accent font-medium text-mk-fg" : "border-transparent text-mk-muted hover:text-mk-fg",
      )}
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}

function MediaPanelMock() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded-md border border-mk-border px-2 py-1.5">
        <Search className="size-3 shrink-0 text-mk-muted" />
        <span className="text-[10px] text-mk-faint">Search</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="grid aspect-video place-items-center rounded-md border border-dashed border-mk-border text-mk-muted">
          <span className="flex flex-col items-center gap-0.5 text-[9px]">
            <Plus className="size-3.5" /> Import
          </span>
        </div>
        {MEDIA_ITEMS.map((it, i) => (
          <div key={it.media + i}>
            <div className="relative aspect-video overflow-hidden rounded-md border border-mk-border">
              {it.media === "video" ? (
                // biome-ignore lint/a11y/useMediaCaption: decorative
                <video src={VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
              ) : (
                // biome-ignore lint/performance/noImgElement: marketing static thumbnail
                <img src={it.media} alt="" className="size-full object-cover" />
              )}
              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[8px] text-white">{it.kind}</span>
            </div>
            <p className="mt-0.5 truncate text-[9px] text-mk-muted">Media {i + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EdTrack({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex border-t border-mk-border" style={{ height: ED_TRACK }}>
      <div className="flex shrink-0 items-center gap-1.5 border-r border-mk-border px-2.5 text-mk-muted" style={{ width: ED_HEADER }}>
        <Lock className="size-3" />
        <Eye className="size-3" />
        <Volume2 className="size-3" />
      </div>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

function EdClip({ left, w, label, media, kind }: { left: string; w: string; label: string; media?: string; kind?: "text" | "audio" }) {
  return (
    <div
      className={cn(
        "absolute inset-y-1 overflow-hidden rounded-md",
        media ? "ring-1 ring-mk-accent/40" : "bg-mk-surface2 ring-1 ring-mk-border",
      )}
      style={{ left, width: w }}
    >
      {media ? (
        <>
          {/* biome-ignore lint/nursery/noImgElement: marketing static image */}
          {/* biome-ignore lint/a11y/useAltText: decorative */}
          <img src={media} alt="" className="absolute inset-0 size-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-mk-accent/10" />
        </>
      ) : kind === "audio" ? (
        <div className="flex size-full items-center gap-[2px] overflow-hidden px-1.5 opacity-70">
          {WAVE.concat(WAVE).map((h, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative bars
            <span key={i} style={{ height: h * 0.7 }} className="w-[2px] shrink-0 rounded-full bg-mk-accent" />
          ))}
        </div>
      ) : null}
      <span className="absolute bottom-0.5 left-1.5 truncate text-[9px] font-medium text-white/90 drop-shadow">{label}</span>
    </div>
  );
}

/* ─────────────────────────── Clips view ─────────────────────────── */

const CLIPS = [
  { score: 94, title: "The hook", t: "0:12", media: "video" as const },
  { score: 88, title: "Best line", t: "0:09", media: IMG },
  { score: 82, title: "Punchline", t: "0:15", media: IMG2 },
  { score: 76, title: "Outro CTA", t: "0:11", media: IMG },
];

function ClipsView() {
  return (
    <div className="flex size-full flex-col gap-2.5 p-3">
      <div className="flex items-center gap-2 rounded-lg border border-mk-border bg-mk-surface px-3 py-2 text-[11px] text-mk-muted">
        <Scissors className="size-3.5 text-mk-accent" />
        <span className="text-mk-fg">neon-tokyo.mp4</span> · 12:34 · <span className="text-mk-accent">4 viral clips</span>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-2.5">
        {CLIPS.map((c) => (
          <div key={c.title} className="relative overflow-hidden rounded-lg border border-mk-border bg-mk-surface2">
            {c.media === "video" ? (
              // biome-ignore lint/a11y/useMediaCaption: decorative
              <video src={VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
            ) : (
              // biome-ignore lint/nursery/noImgElement: marketing static image
              // biome-ignore lint/a11y/useAltText: decorative
              <img src={c.media} alt="" className="size-full object-cover" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.6),transparent_55%)]" />
            <span className="absolute left-1.5 top-1.5 rounded bg-mk-accent px-1.5 py-0.5 text-[9px] font-bold text-mk-accentfg">{c.score}</span>
            <span className="absolute inset-x-1.5 bottom-1.5 truncate text-[10px] font-medium text-white">{c.title}</span>
            <span className="absolute right-1.5 top-1.5 rounded bg-black/50 px-1 py-px text-[8px] font-medium text-white backdrop-blur">{c.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

