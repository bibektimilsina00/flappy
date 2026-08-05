"use client";

import { ArrowUp, Clapperboard, Component, Image as ImageIcon, Type, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { unsplash } from "./media";

/**
 * Interactive product mock: a live mini node-canvas whose nodes mirror the real
 * canvas nodes (header above a bordered box, flush media, side port bars). Drag
 * the nodes — the edges follow — with a real cycling prompt, image, and video.
 * Self-contained; only marketing theme tokens.
 */

const PROMPTS = [
  "Drone shot over neon Tokyo at night, cinematic, volumetric fog",
  "Slow push-in on a rain-slick Seoul alley, moody, 24fps",
  "Golden-hour sweep across Himalayan peaks, epic wide shot",
];
const IMG = unsplash("1540959733332-eab4deabeeaf", 480);
const VIDEO = "https://videos.pexels.com/video-files/2098989/2098989-hd_1920_1080_30fps.mp4";

type NodeId = "text" | "image" | "video";
const NODE: Record<NodeId, { title: string; Icon: typeof Type; inputs: number; flush: boolean }> = {
  text: { title: "Text", Icon: Type, inputs: 1, flush: false },
  image: { title: "Image", Icon: ImageIcon, inputs: 2, flush: true },
  video: { title: "Video", Icon: Video, inputs: 3, flush: true },
};

const HEADER = 24; // header row height above the box
// initial position as a fraction of the canvas + the box width/height in px
const INIT: Record<NodeId, { fx: number; fy: number }> = {
  text: { fx: 0.03, fy: 0.08 },
  image: { fx: 0.4, fy: 0.3 },
  video: { fx: 0.7, fy: 0.52 },
};
const DIM: Record<NodeId, { w: number; boxH: number }> = {
  text: { w: 194, boxH: 66 },
  image: { w: 156, boxH: 104 },
  video: { w: 182, boxH: 104 },
};
const totalH = (id: NodeId) => HEADER + DIM[id].boxH;

export function ProductMock({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 680, h: 340 });
  const [pos, setPos] = useState(INIT);
  const drag = useRef<{ id: NodeId; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState<NodeId | null>(null);

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

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const el = canvasRef.current;
      if (!d || !el) return;
      const r = el.getBoundingClientRect();
      const x = Math.max(6, Math.min(r.width - DIM[d.id].w - 6, e.clientX - r.left - d.ox));
      const y = Math.max(6, Math.min(r.height - totalH(d.id) - 6, e.clientY - r.top - d.oy));
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
  // handles sit on the box (below the header), at its vertical middle
  const anchorY = (id: NodeId) => px(id).y + HEADER + DIM[id].boxH / 2;
  const edge = (a: NodeId, b: NodeId) => {
    const s = { x: px(a).x + DIM[a].w, y: anchorY(a) };
    const e = { x: px(b).x, y: anchorY(b) };
    const dx = Math.max(34, Math.abs(e.x - s.x) * 0.5);
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
          <path d={edge("text", "image")} fill="none" stroke="rgba(20,184,166,0.5)" strokeWidth="2" />
          <path d={edge("image", "video")} fill="none" stroke="rgba(20,184,166,0.5)" strokeWidth="2" />
        </svg>

        <NodeCard id="text" p={px("text")} active={dragging === "text"} onDrag={startDrag("text")}>
          <Typewriter />
        </NodeCard>

        <NodeCard id="image" p={px("image")} active={dragging === "image"} onDrag={startDrag("image")}>
          <div className="relative size-full">
            {/* biome-ignore lint/nursery/noImgElement: marketing static image */}
            {/* biome-ignore lint/a11y/useAltText: decorative */}
            <img src={IMG} alt="" draggable={false} className="size-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.35),transparent_55%)]" />
          </div>
        </NodeCard>

        <NodeCard id="video" p={px("video")} active={dragging === "video"} onDrag={startDrag("video")}>
          <div className="relative size-full bg-mk-surface2">
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

// A node that mirrors the real canvas node: header (icon + title) above a
// bordered box, flush media or padded text, with input/output port bars.
function NodeCard({
  id,
  p,
  active,
  onDrag,
  children,
}: {
  id: NodeId;
  p: { x: number; y: number };
  active: boolean;
  onDrag: (e: React.PointerEvent) => void;
  children: React.ReactNode;
}) {
  const meta = NODE[id];
  const { Icon } = meta;
  return (
    <div
      onPointerDown={onDrag}
      style={{ left: p.x, top: p.y, width: DIM[id].w, touchAction: "none" }}
      className={cn(
        "group/node absolute",
        active ? "z-20 cursor-grabbing" : "z-10 cursor-grab",
      )}
    >
      {/* header above the box */}
      <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[12px] font-medium text-mk-fg">
        <Icon className="size-3.5 shrink-0 text-mk-muted" />
        <span className="truncate">{meta.title}</span>
      </div>

      {/* box */}
      <div
        style={{ height: DIM[id].boxH }}
        className={cn(
          "relative rounded-lg border bg-mk-surface transition-[border-color,box-shadow]",
          active ? "border-white/60 shadow-2xl shadow-black/50" : "border-mk-border shadow-lg",
        )}
      >
        {meta.flush ? (
          <div className="size-full overflow-hidden rounded-[7px]">{children}</div>
        ) : (
          <div className="size-full overflow-hidden p-2.5">{children}</div>
        )}

        {/* input port bars (left) + output port bar (right) */}
        {Array.from({ length: meta.inputs }).map((_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative ports
            key={i}
            style={{ top: `${((i + 1) * 100) / (meta.inputs + 1)}%` }}
            className="absolute -left-[6px] h-[16px] w-[5px] -translate-y-1/2 rounded-l-[3px] bg-mk-muted/50"
          />
        ))}
        <span className="absolute -right-[6px] top-1/2 h-[16px] w-[5px] -translate-y-1/2 rounded-r-[3px] bg-mk-muted/50" />
      </div>
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
    <p className="text-[11px] leading-snug text-mk-muted">
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
