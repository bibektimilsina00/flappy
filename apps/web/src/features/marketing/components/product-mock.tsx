"use client";

import {
  AudioLines,
  Blend,
  Captions,
  ChevronDown,
  Monitor,
  Music,
  Palette,
  Settings,
  Check,
  Clapperboard,
  Component,
  Eye,
  Film,
  Folder,
  History,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  Pause,
  Scissors,
  Shapes,
  Sparkles,
  Type,
  Upload,
  Video,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ClipsFanAnimation } from "@/shared/components/clips-fan-animation";
import { cn } from "@/lib/cn";

/**
 * Interactive product mock: a live mini app with the real Canvas / Editor /
 * Clips tabs. Canvas nodes mirror the app's NodeShell (grey smooth-step wires
 * to real ports) and are draggable, with the node rail on the side. Editor
 * and Clips are faithful mocks. Self-contained (marketing tokens only).
 */

const PROMPTS = [
  "Cute glowing robot, mint shell, big cyan eyes, curious tilt, 3D render",
  "Little robot character, soft rim light, wonder, cinematic",
  "Enchanted bioluminescent forest, glowing mushrooms, drifting fireflies",
];
const AUDIO_PROMPTS = [
  "Cozy whimsical score, soft chimes, gentle strings",
  "Magical ambient, twinkling bells, warm pads",
  "Dreamy lo-fi, mellow, enchanted mood",
];
// Coherent demo assets: a character (A) + a scene (B) → the generated video (A+B).
const IMG = "/mock/robot.jpg"; // Image A — the little robot character
const IMG2 = "/mock/forest.jpg"; // Image B — the enchanted forest
const VIDEO = "/mock/robot-forest.mp4"; // generated: the robot walking the forest

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

export function ProductMock({ className, autopilot }: { className?: string; autopilot?: boolean }) {
  const [view, setView] = useState<View>("canvas");

  // Autopilot: a self-playing, ghost-cursor-driven demo (see ProductDemo).
  if (autopilot) return <ProductDemo className={className} />;

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
  grab = true,
}: {
  node: MockNode;
  p: { x: number; y: number };
  active?: boolean;
  onDrag?: (e: React.PointerEvent) => void;
  anim?: "in" | "out";
  grab?: boolean; // false keeps the container's own cursor (demo uses one shared cursor)
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
              ? grab
                ? "z-20 cursor-grabbing"
                : "z-20"
              : grab
                ? "z-10 cursor-grab"
                : "z-10",
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
        <img src={node.media} alt="AI-generated video still in the Riocut node canvas" draggable={false} className="size-full object-cover" />
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

/* ─────────────────────────── Editor view (VEED-style) ─────────────────────────── */

const ED_RAIL: { Icon: typeof Type; label: string }[] = [
  { Icon: Sparkles, label: "AI" },
  { Icon: Video, label: "Video" },
  { Icon: Music, label: "Audio" },
  { Icon: ImageIcon, label: "Image" },
  { Icon: Captions, label: "Subs" },
  { Icon: Type, label: "Text" },
  { Icon: Shapes, label: "Elements" },
  { Icon: Palette, label: "Brand" },
];
const ED_TILES: { Icon: typeof Type; label: string }[] = [
  { Icon: Video, label: "AI Video" },
  { Icon: ImageIcon, label: "AI Image" },
  { Icon: Film, label: "B-roll" },
  { Icon: Blend, label: "Transitions" },
];
const ED_TOGGLES = [
  { label: "Clean audio", on: true },
  { label: "Remove filler words", on: false },
  { label: "Eye contact", on: true },
  { label: "Remove background", on: false },
];
const ED_HEADER_W = 60;
const ED_TRACK_H = 24;
const ED_CLIP_BG: Record<string, string> = {
  video: "bg-[#2a2a2a]",
  text: "bg-[#1f9b9b]/85",
  audio: "bg-[#2a2f3a]",
};

function EditorView() {
  return (
    <div className="flex size-full gap-1.5 p-1.5 text-[10px]">
      {/* left sidebar — icon rail + AI Tools panel */}
      <aside className="flex w-44 shrink-0 overflow-hidden rounded-lg border border-mk-border bg-mk-surface">
        <nav className="flex w-9 shrink-0 flex-col gap-0.5 border-r border-mk-border p-1">
          {ED_RAIL.map((r, i) => (
            <div
              key={r.label}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md px-0.5 py-1 text-[7px] font-medium",
                i === 0 ? "bg-white/10 text-mk-fg" : "text-mk-muted",
              )}
            >
              <r.Icon className="size-3.5" style={i === 0 ? { color: "#14b8a6" } : undefined} />
              {r.label}
            </div>
          ))}
        </nav>
        <div className="min-w-0 flex-1 overflow-hidden p-2">
          <p className="mb-2 text-[11px] font-semibold text-mk-fg">AI Tools</p>
          {/* Generate CTA */}
          <div className="flex items-center gap-2 rounded-lg border border-mk-border p-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-mk-accent text-mk-accentfg">
              <Sparkles className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-mk-fg">Generate with AI</p>
              <p className="text-[8px] text-mk-muted">Describe it — we'll create it</p>
            </div>
          </div>
          {/* tiles */}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {ED_TILES.map((t) => (
              <div key={t.label} className="flex flex-col items-start gap-1 rounded-lg border border-mk-border p-1.5">
                <t.Icon className="size-3.5 text-mk-accent" />
                <span className="text-[8px] font-medium text-mk-fg">{t.label}</span>
              </div>
            ))}
          </div>
          {/* toggles */}
          <div className="mt-2.5 space-y-1.5">
            {ED_TOGGLES.map((t) => (
              <div key={t.label} className="flex items-center gap-1.5">
                <span className="flex-1 text-[9px] text-mk-fg/90">{t.label}</span>
                <span className="rounded bg-mk-accent/15 px-1 py-px text-[7px] font-semibold text-mk-accent">AI</span>
                <span className={cn("relative h-3 w-5 rounded-full", t.on ? "bg-mk-accent" : "bg-white/15")}>
                  <span className={cn("absolute top-0.5 size-2 rounded-full bg-white", t.on ? "left-[11px]" : "left-0.5")} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* right column — preview over timeline */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* preview */}
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-mk-border bg-mk-surface p-2">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="relative h-full max-h-full overflow-hidden rounded-md border border-mk-border shadow-lg" style={{ aspectRatio: "16 / 9" }}>
              {/* biome-ignore lint/a11y/useMediaCaption: decorative */}
              <video src={VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
            </div>
          </div>
          {/* Aspect | Background | Settings pill */}
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-mk-border bg-mk-bg p-1 text-[9px] text-mk-muted">
            <span className="flex items-center gap-1 px-1.5 py-0.5">
              <Monitor className="size-3" /> 16:9 <ChevronDown className="size-2.5" />
            </span>
            <span className="h-3 w-px bg-mk-border" />
            <span className="flex items-center gap-1 px-1.5 py-0.5">
              <span className="size-2.5 rounded-full bg-mk-accent" /> Background
            </span>
            <span className="h-3 w-px bg-mk-border" />
            <span className="flex items-center gap-1 px-1.5 py-0.5">
              <Settings className="size-3" /> Settings
            </span>
          </div>
        </main>

        {/* timeline */}
        <div className="flex h-[122px] shrink-0 flex-col overflow-hidden rounded-lg border border-mk-border bg-mk-surface">
          {/* toolbar */}
          <div className="flex items-center border-b border-mk-border px-2 py-1.5 text-[9px]">
            <span className="flex items-center gap-1 text-mk-muted">
              <Scissors className="size-3" /> Split
            </span>
            <span className="flex-1" />
            <span className="grid size-5 place-items-center rounded-full border border-mk-border text-mk-fg">
              <Pause className="size-2.5" />
            </span>
            <span className="ml-2 font-mono tabular-nums text-mk-muted">
              00:12.0 <span className="text-mk-accent">/ 00:30.0</span>
            </span>
            <span className="flex-1" />
            <span className="text-mk-muted">Fit</span>
          </div>
          {/* ruler + tracks */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className="flex h-4 border-b border-mk-border">
              <div className="shrink-0 border-r border-mk-border" style={{ width: ED_HEADER_W }} />
              <div className="relative flex-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed ruler ticks
                    key={i}
                    className="absolute top-0.5 ml-0.5 text-[7px] text-mk-faint"
                    style={{ left: `${(i / 6) * 100}%` }}
                  >
                    {i * 5}s
                  </span>
                ))}
              </div>
            </div>
            <EdTrack>
              <EdClip left="2%" w="40%" kind="video" media={IMG} />
              <EdClip left="44%" w="30%" kind="video" media={IMG2} />
            </EdTrack>
            <EdTrack>
              <EdClip left="8%" w="34%" kind="text" label="captions" />
            </EdTrack>
            <EdTrack>
              <EdClip left="0%" w="100%" kind="audio" label="music" />
            </EdTrack>
            <div
              className="pointer-events-none absolute inset-y-0 z-20 w-px bg-mk-accent"
              style={{ left: `calc(${ED_HEADER_W}px + 30%)` }}
            >
              <span className="absolute -left-[3px] top-0 size-1.5 rounded-sm bg-mk-accent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EdTrack({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex border-b border-mk-border" style={{ height: ED_TRACK_H }}>
      <div className="flex shrink-0 items-center gap-1 border-r border-mk-border px-2 text-mk-muted" style={{ width: ED_HEADER_W }}>
        <Lock className="size-2.5" />
        <Eye className="size-2.5" />
        <Volume2 className="size-2.5" />
      </div>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

function EdClip({ left, w, kind, media, label }: { left: string; w: string; kind: string; media?: string; label?: string }) {
  return (
    <div
      className={cn("absolute inset-y-0.5 overflow-hidden rounded border border-white/10", ED_CLIP_BG[kind] ?? ED_CLIP_BG.video)}
      style={{ left, width: w }}
    >
      {media ? (
        <>
          {/* biome-ignore lint/nursery/noImgElement: marketing static thumbnail */}
          <img src={media} alt="Timeline clip thumbnail in the Riocut editor" className="absolute inset-0 size-full object-cover opacity-55" />
        </>
      ) : kind === "audio" ? (
        <div className="flex size-full items-center gap-[2px] overflow-hidden px-1 opacity-70">
          {WAVE.concat(WAVE).map((h, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative bars
            <span key={i} style={{ height: h * 0.5 }} className="w-[2px] shrink-0 rounded-full bg-mk-accent" />
          ))}
        </div>
      ) : null}
      {label ? <span className="absolute bottom-0 left-1 truncate text-[7px] font-medium text-white/90 drop-shadow">{label}</span> : null}
    </div>
  );
}

/* ─────────────────────────── Clips view ─────────────────────────── */

// The clips empty state — paste a link or upload, with the fan animation beside.
function ClipsView() {
  return (
    <div className="grid size-full items-center gap-2 p-4 md:grid-cols-2">
      {/* left — create card */}
      <div className="mx-auto w-full max-w-md">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mk-accent">AI Clips</p>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-mk-fg sm:text-2xl">Video In. Clips Out.</h2>
          <p className="mt-1.5 text-[11px] text-mk-muted">
            Paste a link or upload — AI cuts your video into ready-to-post clips.
          </p>
        </div>

        {/* paste a link */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-mk-border bg-mk-surface px-3 py-2.5">
          <Link2 className="size-4 shrink-0 text-mk-muted" />
          <span className="flex-1 truncate text-[11px] text-mk-faint">Paste a YouTube or video link…</span>
          <span className="rounded-lg bg-mk-accent px-3 py-1 text-[10px] font-semibold text-mk-accentfg">Get clips</span>
        </div>

        {/* divider */}
        <div className="my-3 flex items-center gap-3 text-[10px] text-mk-faint">
          <span className="h-px flex-1 bg-mk-border" /> or <span className="h-px flex-1 bg-mk-border" />
        </div>

        {/* upload dropzone */}
        <div className="grid place-items-center gap-1.5 rounded-xl border border-dashed border-mk-border bg-mk-surface/40 py-6 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-mk-accent/10 text-mk-accent">
            <Upload className="size-5" />
          </div>
          <p className="text-[11px] font-semibold text-mk-fg">Upload a video</p>
          <p className="text-[10px] text-mk-muted">Drag &amp; drop or browse · MP4, MOV up to 2 hours</p>
        </div>

        <p className="mt-3 text-center text-[9px] text-mk-faint">
          Works with YouTube, uploads, and public links
        </p>
      </div>

      {/* right — heading + the "1 video → 10 clips" fan animation, scaled to fit */}
      <div className="hidden flex-col items-center justify-center md:flex">
        <div className="mb-1 max-w-[220px] text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-mk-accent">AI Clips</p>
          <h3 className="mt-1 text-base font-bold tracking-tight text-mk-fg">
            1 long video → <span className="text-mk-accent">10 viral clips</span>
          </h3>
          <p className="mt-1 text-[9px] leading-snug text-mk-muted">
            AI hunts down every hook and highlight — then cuts them into captioned shorts.
          </p>
        </div>
        <div className="flex h-[260px] items-center justify-center">
          <div className="scale-[0.5]">
            <ClipsFanAnimation glow={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ Autopilot demo — ghost-cursor product tour ══════════════════ */

type DemoView = "canvas" | "clips";
interface DemoStep {
  view: DemoView;
  phase: string;
  target?: string; // data-demo id the ghost cursor flies to and "clicks"
  dwell: number; // ms this step is held
  caption: string;
  rest?: boolean; // pause: hide the cursor + caption before the loop replays
}

// The scripted storyline: generate a video on the canvas. Loops forever. The
// user can switch tabs manually to explore the Editor / Clips at any time.
const STEPS: DemoStep[] = [
  { view: "canvas", phase: "idle", dwell: 1200, caption: "Start on the canvas" },
  { view: "canvas", phase: "idle", target: "rail-video", dwell: 1200, caption: "Add a video node" },
  { view: "canvas", phase: "spawning", dwell: 1500, caption: "Prompt your shot" },
  { view: "canvas", phase: "prompted", target: "generate", dwell: 1100, caption: "Generate" },
  { view: "canvas", phase: "generating", dwell: 2000, caption: "Generating video…" },
  { view: "canvas", phase: "ready", dwell: 2600, caption: "Your shot is ready" },
  // long pause — cursor + caption hidden — before the demo replays
  { view: "canvas", phase: "ready", dwell: 4500, caption: "", rest: true },
];

// The user's real cursor over the demo: an up-left amber arrow — distinct from
// the violet autopilot cursor in both direction and colour.
const USER_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpolygon points='21 11 2 2 11 21 13 13 21 11' fill='%23f59e0b'/%3E%3C/svg%3E\") 2 2, auto";

function useMediaFlag(query: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const h = () => setOn(m.matches);
    h();
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, [query]);
  return on;
}

// Step engine: advances on a per-step timer, loops, and pulses `clicking` shortly
// before a targeted step ends (so the click reads as causing the next state).
function useAutopilot(steps: DemoStep[]) {
  const [i, setI] = useState(0);
  const [clicking, setClicking] = useState(false);
  useEffect(() => {
    const step = steps[i];
    let clickT: ReturnType<typeof setTimeout> | undefined;
    let clickEnd: ReturnType<typeof setTimeout> | undefined;
    if (step.target) {
      clickT = setTimeout(() => {
        setClicking(true);
        clickEnd = setTimeout(() => setClicking(false), 240);
      }, Math.max(300, step.dwell - 380));
    }
    const next = setTimeout(() => setI((n) => (n + 1) % steps.length), step.dwell);
    return () => {
      clearTimeout(next);
      if (clickT) clearTimeout(clickT);
      if (clickEnd) clearTimeout(clickEnd);
    };
  }, [i, steps]);
  return { step: steps[i], clicking };
}

// An arrow cursor that glides to whichever element carries the active data-demo id.
function GhostCursor({
  frameRef,
  target,
  clicking,
}: {
  frameRef: React.RefObject<HTMLDivElement | null>;
  target?: string;
  clicking: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!target) return;
    const measure = () => {
      const frame = frameRef.current;
      if (!frame) return;
      const el = frame.querySelector<HTMLElement>(`[data-demo="${target}"]`);
      if (!el) return;
      const fr = frame.getBoundingClientRect();
      const tr = el.getBoundingClientRect();
      setPos({ x: tr.left - fr.left + tr.width / 2, y: tr.top - fr.top + tr.height / 2 });
    };
    measure();
    const t = setTimeout(measure, 90); // re-measure once spawn/layout settles
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [target, frameRef]);

  if (!pos) return null;
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[70] transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {/* filled pink navigation-arrow cursor (tip anchored to the point) */}
      {clicking ? (
        <span className="absolute left-0 top-0 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff4d8d]/30 animate-ping" />
      ) : null}
      <svg
        viewBox="0 0 24 24"
        width="26"
        height="26"
        aria-hidden="true"
        className={cn("transition-transform duration-150", clicking && "scale-90")}
        style={{ marginLeft: -2, marginTop: -2 }}
      >
        <polygon points="21 11 2 2 11 21 13 13 21 11" fill="#ff4d8d" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function DemoCaption({ text }: { text: string }) {
  return (
    <div className="mt-4 flex justify-center">
      <span
        key={text}
        className="mk-in inline-flex items-center gap-2 rounded-full border border-mk-border bg-mk-surface px-3.5 py-1.5 text-xs font-medium text-mk-fg shadow-sm"
      >
        <span className="size-1.5 rounded-full bg-mk-accent" />
        {text}
      </span>
    </div>
  );
}

/* ── driven canvas: context graph + one scripted video node ── */

const CTX_NODES = NODES.filter((n) => n.id !== "video");
const CTX_EDGES = EDGES.filter((e) => e.to !== "video");
const VID_EDGES = EDGES.filter((e) => e.to === "video");

function CanvasAuto({ phase }: { phase: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 520 });
  const [pos, setPos] = useState<Record<string, { fx: number; fy: number }>>(
    Object.fromEntries(NODES.map((n) => [n.id, { fx: n.fx, fy: n.fy }])),
  );
  const drag = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // node dragging — same feel as the interactive canvas
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const el = ref.current;
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
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { id, ox: e.clientX - r.left - pos[id].fx * r.width, oy: e.clientY - r.top - pos[id].fy * r.height };
    setDragging(id);
  };

  const at = (id: string) => ({ x: pos[id].fx * size.w, y: pos[id].fy * size.h });
  const portY = (id: string, isOutput: boolean, index: number) => {
    const k = KIND_OF[id];
    const boxTop = at(id).y + HEADER;
    const count = isOutput ? 1 : KIND[k].inputs;
    return count === 1 ? boxTop + PORT_TOP : boxTop + (KIND[k].boxH * (index + 1)) / (count + 1);
  };
  const wire = (from: string, to: string, port: number) =>
    smoothStep(at(from).x + KIND[KIND_OF[from]].w, portY(from, true, 0), at(to).x, portY(to, false, port), 12);

  const vidShown = phase !== "idle";
  const vp = at("video");

  return (
    <div ref={ref} className="relative size-full mk-bg-grid">
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        {[...CTX_EDGES, ...(vidShown ? VID_EDGES : [])].map((e) => (
          <path key={`${e.from}-${e.to}-${e.port}`} d={wire(e.from, e.to, e.port)} fill="none" stroke={EDGE_STROKE} strokeWidth={2} />
        ))}
      </svg>

      {CTX_NODES.map((n) => (
        <NodeCard key={n.id} node={n} p={at(n.id)} active={dragging === n.id} onDrag={startDrag(n.id)} grab={false} />
      ))}
      {/* the video node is autopilot-only — not draggable (dragging it looks off) */}
      {vidShown ? <VideoNode phase={phase} x={vp.x} y={vp.y} /> : null}

      {/* node rail — the Video button is the ghost cursor's target (display only) */}
      <div className="pointer-events-none absolute left-3 top-1/2 z-40 -translate-y-1/2">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-mk-border bg-mk-surface p-2 shadow-xl">
          {RAIL.map((item, i) =>
            "divider" in item ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed dividers
              <div key={`d${i}`} className="my-1 h-px w-6 bg-mk-border" />
            ) : (
              <div
                key={item.label}
                data-demo={item.kind === "video" ? "rail-video" : undefined}
                className={cn(
                  "grid size-9 place-items-center rounded-lg text-mk-muted",
                  item.kind === "video" && phase === "idle" && "bg-white/10 text-mk-fg",
                )}
              >
                <item.Icon className="size-[18px]" />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function VideoNode({
  phase,
  x,
  y,
  active,
  onDrag,
}: {
  phase: string;
  x: number;
  y: number;
  active?: boolean;
  onDrag?: (e: React.PointerEvent) => void;
}) {
  const { Icon, w, boxH, inputs } = KIND.video;
  return (
    <div
      onPointerDown={onDrag}
      style={{ left: x, top: y, width: w }}
      className={cn("pointer-events-none absolute z-30 animate-in fade-in-0 zoom-in-95 duration-300", active && "z-40")}
    >
      <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[12px] font-medium text-mk-fg">
        <Icon className="size-3.5 shrink-0 text-mk-muted" />
        <span className="truncate">Video</span>
        {phase === "generating" ? (
          <Loader2 className="ml-auto size-3 animate-spin text-mk-accent" />
        ) : phase === "ready" ? (
          <Check className="ml-auto size-3 text-mk-accent" />
        ) : null}
      </div>
      <div
        style={{ height: boxH }}
        className={cn(
          "relative overflow-hidden rounded-lg border bg-mk-surface shadow-lg",
          phase === "generating" ? "border-mk-accent/50 ring-2 ring-mk-accent/30 animate-pulse" : "border-mk-border",
        )}
      >
        {phase === "ready" ? (
          <>
            {/* biome-ignore lint/a11y/useMediaCaption: decorative */}
            <video src={VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
            <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-px text-[8px] font-medium text-white backdrop-blur">1080p</span>
          </>
        ) : phase === "generating" ? (
          <div className="grid size-full place-content-center justify-items-center gap-1.5 bg-mk-surface2">
            <Loader2 className="size-5 animate-spin text-mk-accent" />
            <span className="text-[10px] text-mk-muted">Generating…</span>
          </div>
        ) : (
          <div className="flex size-full flex-col justify-between p-2">
            <p className="text-[10px] leading-snug text-mk-muted">Little robot exploring the enchanted forest — combine both shots…</p>
            <button
              type="button"
              data-demo="generate"
              className={cn(
                "flex items-center justify-center gap-1 rounded-md bg-mk-accent py-1 text-[10px] font-semibold text-mk-accentfg transition-opacity",
                phase === "prompted" ? "opacity-100" : "opacity-0",
              )}
            >
              <Sparkles className="size-3" /> Generate
            </button>
          </div>
        )}
        {Array.from({ length: inputs }).map((_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative ports
            key={i}
            style={{ top: `${((i + 1) * 100) / (inputs + 1)}%` }}
            className="absolute -left-[6px] h-[16px] w-[5px] -translate-y-1/2 rounded-l-[3px] bg-mk-muted/50"
          />
        ))}
        <span style={{ top: PORT_TOP }} className="absolute -right-[6px] h-[16px] w-[5px] -translate-y-1/2 rounded-r-[3px] bg-mk-muted/50" />
      </div>
    </div>
  );
}


/* ── orchestrator: chrome + driven views + ghost cursor + caption ── */

function ProductDemo({ className }: { className?: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const reduced = useMediaFlag("(prefers-reduced-motion: reduce)");
  const isMobile = useMediaFlag("(max-width: 640px)");
  const { step, clicking } = useAutopilot(STEPS);
  const [view, setView] = useState<View>("canvas");
  const onCanvas = view === "canvas";
  // Ghost cursor + captions only run the canvas generation demo (and pause on rest).
  const showCursor = onCanvas && !step.rest && !reduced && !isMobile;

  // Cursor holds its last target when the current step doesn't specify one.
  const lastTarget = useRef<string | undefined>(undefined);
  if (step.target) lastTarget.current = step.target;

  // Track the user's real pointer so we can tag it with a "You" label.
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  const tabs = [
    { id: "canvas", label: "Canvas", Icon: Component },
    { id: "editor", label: "Editor", Icon: Clapperboard },
    { id: "clips", label: "Clips", Icon: Scissors },
  ] as const;

  return (
    <div className={className}>
      {/* the demo section shows the pink navigation arrow as the real cursor too */}
      <div
        ref={frameRef}
        onPointerMove={(e) => {
          const r = frameRef.current?.getBoundingClientRect();
          if (r) setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
        onPointerLeave={() => setMouse(null)}
        className="relative w-full select-none overflow-hidden rounded-2xl border border-mk-border bg-mk-surface"
        style={{ cursor: USER_CURSOR }}
      >
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
        <div className="relative h-[480px] bg-mk-bg sm:h-[560px]">
          {view === "canvas" ? <CanvasAuto phase={step.phase} /> : view === "editor" ? <EditorView /> : <ClipsView />}
        </div>

        {/* bottom tabs — user can switch manually */}
        <div className="flex items-stretch border-t border-mk-border bg-mk-surface2 text-[13px]">
          {tabs.map(({ id, label, Icon }) => {
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

        {showCursor ? <GhostCursor frameRef={frameRef} target={step.target ?? lastTarget.current} clicking={clicking} /> : null}

        {/* "You" tag trailing the real cursor */}
        {mouse && !isMobile ? (
          <div className="pointer-events-none absolute left-0 top-0 z-[80]" style={{ transform: `translate(${mouse.x}px, ${mouse.y}px)` }}>
            <span className="absolute left-4 top-3.5 whitespace-nowrap rounded-md bg-[#f59e0b] px-1.5 py-0.5 text-[10px] font-bold text-black shadow-md">
              You
            </span>
          </div>
        ) : null}
      </div>

      {showCursor ? <DemoCaption text={step.caption} /> : null}
    </div>
  );
}

