"use client";

import { ArrowUp, Clapperboard, Component, Image as ImageIcon, Sparkles, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { unsplash } from "./media";

/**
 * Interactive product mock: a live mini node-canvas. Drag the nodes around —
 * the edges follow — with a real cycling prompt, a real image, and a playing
 * video. Self-contained; only depends on the marketing theme tokens.
 */

const PROMPTS = [
  "Drone shot over neon Tokyo at night, cinematic, volumetric fog",
  "Slow push-in on a rain-slick Seoul alley, moody, 24fps",
  "Golden-hour sweep across Himalayan peaks, epic wide shot",
];
const IMG = unsplash("1540959733332-eab4deabeeaf", 480);
const VIDEO = "https://videos.pexels.com/video-files/2098989/2098989-hd_1920_1080_30fps.mp4";

type NodeId = "prompt" | "image" | "video";
// initial positions as a fraction of the canvas (scales with width) + approx px
// dimensions used for the edge anchors and the drag clamp.
const INIT: Record<NodeId, { fx: number; fy: number }> = {
  prompt: { fx: 0.03, fy: 0.09 },
  image: { fx: 0.4, fy: 0.32 },
  video: { fx: 0.7, fy: 0.54 },
};
const DIM: Record<NodeId, { w: number; h: number }> = {
  prompt: { w: 188, h: 96 },
  image: { w: 152, h: 132 },
  video: { w: 176, h: 132 },
};

export function ProductMock({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 680, h: 340 });
  const [pos, setPos] = useState(INIT);
  const drag = useRef<{ id: NodeId; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState<NodeId | null>(null);

  // measure the canvas so edges + drag clamp work in real px
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // drag via window listeners so it keeps tracking if the pointer leaves a node
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const el = canvasRef.current;
      if (!d || !el) return;
      const r = el.getBoundingClientRect();
      const x = Math.max(6, Math.min(r.width - DIM[d.id].w - 6, e.clientX - r.left - d.ox));
      const y = Math.max(6, Math.min(r.height - DIM[d.id].h - 6, e.clientY - r.top - d.oy));
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

  const startDrag = (id: NodeId) => (e: React.PointerEvent) => {
    const el = canvasRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = {
      id,
      ox: e.clientX - r.left - pos[id].fx * r.width,
      oy: e.clientY - r.top - pos[id].fy * r.height,
    };
    setDragging(id);
  };

  const px = (id: NodeId) => ({ x: pos[id].fx * size.w, y: pos[id].fy * size.h });
  const edge = (a: NodeId, b: NodeId) => {
    const s = { x: px(a).x + DIM[a].w, y: px(a).y + DIM[a].h / 2 };
    const e = { x: px(b).x, y: px(b).y + DIM[b].h / 2 };
    const dx = Math.max(36, Math.abs(e.x - s.x) * 0.5);
    return `M ${s.x} ${s.y} C ${s.x + dx} ${s.y}, ${e.x - dx} ${e.y}, ${e.x} ${e.y}`;
  };

  return (
    <div
      className={cn(
        "w-full select-none overflow-hidden rounded-2xl border border-mk-border bg-mk-surface",
        className,
      )}
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-mk-border bg-mk-surface2 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <div className="ml-3 flex items-center gap-1 rounded-md bg-mk-bg px-2 py-1 text-[11px] text-mk-faint">
          <Component className="size-3 text-mk-accent" /> Untitled project · Canvas
        </div>
      </div>

      {/* canvas */}
      <div ref={canvasRef} className="relative h-[320px] bg-mk-bg mk-bg-grid sm:h-[360px]">
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          <path d={edge("prompt", "image")} fill="none" stroke="rgba(20,184,166,0.55)" strokeWidth="2" />
          <path d={edge("image", "video")} fill="none" stroke="rgba(20,184,166,0.55)" strokeWidth="2" />
        </svg>

        <NodeCard id="prompt" p={px("prompt")} active={dragging === "prompt"} onDrag={startDrag("prompt")} icon={<Sparkles className="size-3.5" />} title="Prompt">
          <Typewriter />
        </NodeCard>

        <NodeCard id="image" p={px("image")} active={dragging === "image"} onDrag={startDrag("image")} icon={<ImageIcon className="size-3.5" />} title="Image">
          <div className="relative overflow-hidden rounded-md" style={{ height: DIM.image.h - 44 }}>
            {/* biome-ignore lint/nursery/noImgElement: marketing static image */}
            {/* biome-ignore lint/a11y/useAltText: decorative */}
            <img src={IMG} alt="" draggable={false} className="size-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.35),transparent_55%)]" />
          </div>
        </NodeCard>

        <NodeCard id="video" p={px("video")} active={dragging === "video"} onDrag={startDrag("video")} icon={<Video className="size-3.5" />} title="Video" running>
          <div className="relative overflow-hidden rounded-md bg-mk-surface2" style={{ height: DIM.video.h - 44 }}>
            {/* biome-ignore lint/a11y/useMediaCaption: decorative */}
            <video src={VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.4),transparent_50%)]" />
            <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-px text-[8px] font-medium text-white backdrop-blur">
              1080p
            </span>
          </div>
        </NodeCard>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-mk-border bg-mk-surface px-2 py-1.5 shadow-lg">
          <span className="px-2 text-[11px] text-mk-muted">Google Veo · 1080p</span>
          <span className="grid size-6 place-items-center rounded-full bg-mk-accent text-mk-accentfg">
            <ArrowUp className="size-3.5" />
          </span>
        </div>
      </div>

      {/* timeline */}
      <div className="border-t border-mk-border bg-mk-surface2">
        <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-mk-faint">
          <Clapperboard className="size-3.5 text-mk-accent" /> Timeline
          <span className="ml-auto tabular-nums">00:12 / 00:30</span>
        </div>
        <div className="relative px-4 pb-4">
          <div className="mb-1 flex justify-between text-[9px] tabular-nums text-mk-faint">
            {["00", "05", "10", "15", "20", "25"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="space-y-1.5">
            <TimelineRow>
              <Clip className="left-0 w-[34%] bg-mk-accent/80" label="shot 01" />
              <Clip className="left-[34%] w-[30%] bg-mk-accent/50" label="shot 02" />
              <Clip className="left-[64%] w-[36%] bg-mk-accent/80" label="shot 03" />
            </TimelineRow>
            <TimelineRow>
              <Clip className="left-[10%] w-[45%] bg-mk-surface ring-1 ring-mk-border" label="captions" muted />
            </TimelineRow>
            <TimelineRow>
              <Clip className="left-0 w-full bg-mk-surface ring-1 ring-mk-border" label="music" muted />
            </TimelineRow>
          </div>
          <div className="mk-sweep pointer-events-none absolute inset-y-2 w-px bg-mk-accent">
            <span className="absolute -left-[3px] top-0 size-1.5 rounded-sm bg-mk-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeCard({
  id,
  p,
  active,
  onDrag,
  icon,
  title,
  running,
  children,
}: {
  id: NodeId;
  p: { x: number; y: number };
  active: boolean;
  onDrag: (e: React.PointerEvent) => void;
  icon: React.ReactNode;
  title: string;
  running?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      onPointerDown={onDrag}
      style={{ left: p.x, top: p.y, width: DIM[id].w, touchAction: "none" }}
      className={cn(
        "absolute rounded-xl border bg-mk-surface p-2.5 shadow-lg transition-[box-shadow,border-color]",
        active
          ? "z-20 cursor-grabbing border-mk-accent/60 shadow-2xl shadow-black/50"
          : "z-10 cursor-grab border-mk-borders hover:border-mk-accent/40",
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-mk-fg">
        <span className="text-mk-accent">{icon}</span>
        {title}
        {running ? <span className="ml-auto size-1.5 animate-pulse rounded-full bg-mk-accent" /> : null}
      </div>
      {children}
    </div>
  );
}

// Cycles through prompts with a type/hold/erase effect (static on reduced-motion).
function Typewriter() {
  const [text, setText] = useState(PROMPTS[0]);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let pi = 0;
    let ci = PROMPTS[0].length;
    let deleting = true;
    let timer = window.setTimeout(step, 1600);
    function step() {
      const full = PROMPTS[pi];
      ci += deleting ? -1 : 1;
      setText(full.slice(0, ci));
      let delay = deleting ? 24 : 52;
      if (!deleting && ci >= full.length) {
        deleting = true;
        delay = 1600;
      } else if (deleting && ci <= 0) {
        deleting = false;
        pi = (pi + 1) % PROMPTS.length;
        delay = 320;
      }
      timer = window.setTimeout(step, delay);
    }
    return () => clearTimeout(timer);
  }, []);
  return (
    <p className="min-h-[2.75rem] text-[11px] leading-snug text-mk-muted">
      {text}
      <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-mk-accent align-middle" />
    </p>
  );
}

function TimelineRow({ children }: { children: React.ReactNode }) {
  return <div className="relative h-7 rounded-md bg-mk-bg">{children}</div>;
}

function Clip({ className, label, muted }: { className?: string; label: string; muted?: boolean }) {
  return (
    <div className={cn("absolute inset-y-0 flex items-center overflow-hidden rounded-md px-2", className)}>
      <span className={cn("truncate text-[9px] font-medium", muted ? "text-mk-muted" : "text-mk-accentfg")}>{label}</span>
    </div>
  );
}
