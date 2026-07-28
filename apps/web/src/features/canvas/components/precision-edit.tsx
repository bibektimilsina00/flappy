"use client";

import {
  Brush,
  Circle,
  Eraser,
  MousePointer2,
  MoveUpRight,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { compositeAsset } from "@/features/projects";

type Pt = [number, number];
type Shape =
  | { type: "pen"; color: string; width: number; pts: Pt[] }
  | { type: "rect" | "ellipse" | "arrow"; color: string; width: number; a: Pt; b: Pt }
  | { type: "text"; color: string; at: Pt; text: string };

type Tool = "select" | "arrow" | "rect" | "ellipse" | "text" | "pen" | "eraser";

const TOOLS: { tool: Tool; icon: typeof Brush; label: string }[] = [
  { tool: "select", icon: MousePointer2, label: "Select" },
  { tool: "arrow", icon: MoveUpRight, label: "Arrow" },
  { tool: "rect", icon: Square, label: "Rectangle" },
  { tool: "ellipse", icon: Circle, label: "Ellipse" },
  { tool: "text", icon: Type, label: "Text" },
  { tool: "pen", icon: Brush, label: "Draw" },
  { tool: "eraser", icon: Eraser, label: "Erase" },
];
const COLORS = ["#e64bd8", "#3ba7e6", "#e6483b", "#e6c93b", "#43c463", "#ffffff", "#111111"];

function draw(ctx: CanvasRenderingContext2D, shapes: Shape[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const s of shapes) {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    if (s.type === "pen") {
      ctx.lineWidth = s.width;
      ctx.beginPath();
      s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    } else if (s.type === "rect") {
      ctx.lineWidth = s.width;
      ctx.strokeRect(Math.min(s.a[0], s.b[0]), Math.min(s.a[1], s.b[1]), Math.abs(s.b[0] - s.a[0]), Math.abs(s.b[1] - s.a[1]));
    } else if (s.type === "ellipse") {
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.ellipse((s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2, Math.abs(s.b[0] - s.a[0]) / 2, Math.abs(s.b[1] - s.a[1]) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === "arrow") {
      ctx.lineWidth = s.width;
      const [x1, y1] = s.a;
      const [x2, y2] = s.b;
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const head = 10 + s.width * 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
      ctx.stroke();
    } else if (s.type === "text") {
      ctx.font = "24px sans-serif";
      ctx.fillText(s.text, s.at[0], s.at[1]);
    }
  }
}

function hit(s: Shape, [x, y]: Pt): boolean {
  if (s.type === "pen") return s.pts.some(([px, py]) => Math.hypot(px - x, py - y) < 12);
  if (s.type === "text") return x >= s.at[0] - 4 && x <= s.at[0] + s.text.length * 13 && y <= s.at[1] + 6 && y >= s.at[1] - 24;
  const [x1, y1] = s.a;
  const [x2, y2] = s.b;
  return x >= Math.min(x1, x2) - 8 && x <= Math.max(x1, x2) + 8 && y >= Math.min(y1, y2) - 8 && y <= Math.max(y1, y2) + 8;
}

export function PrecisionEdit({
  src,
  onDone,
  onClose,
}: {
  src: string;
  onDone: (result: { key: string; url: string }) => void;
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [past, setPast] = useState<Shape[][]>([]);
  const [future, setFuture] = useState<Shape[][]>([]);
  const [busy, setBusy] = useState(false);
  const draftRef = useRef<Shape | null>(null);
  const drawingRef = useRef(false);

  const commit = (next: Shape[]) => {
    setPast((p) => [...p, shapes]);
    setFuture([]);
    setShapes(next);
  };
  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [shapes, ...f]);
    setShapes(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
  };
  const redo = () => {
    if (!future.length) return;
    setPast((p) => [...p, shapes]);
    setShapes(future[0]);
    setFuture((f) => f.slice(1));
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, draftRef.current ? [...shapes, draftRef.current] : shapes);
  }, [shapes, size]);

  const pt = (e: React.PointerEvent): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const paint = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, draftRef.current ? [...shapes, draftRef.current] : shapes);
  };

  const onDown = (e: React.PointerEvent) => {
    const p = pt(e);
    if (tool === "select") return;
    if (tool === "eraser") {
      const idx = [...shapes].reverse().findIndex((s) => hit(s, p));
      if (idx >= 0) commit(shapes.filter((_, i) => i !== shapes.length - 1 - idx));
      return;
    }
    if (tool === "text") {
      const text = window.prompt("Text:");
      if (text) commit([...shapes, { type: "text", color, at: p, text }]);
      return;
    }
    drawingRef.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    draftRef.current =
      tool === "pen"
        ? { type: "pen", color, width: 3, pts: [p] }
        : { type: tool, color, width: 3, a: p, b: p };
    paint();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !draftRef.current) return;
    const p = pt(e);
    const d = draftRef.current;
    if (d.type === "pen") d.pts.push(p);
    else if (d.type !== "text") d.b = p;
    paint();
  };
  const onUp = () => {
    if (!drawingRef.current || !draftRef.current) return;
    drawingRef.current = false;
    const d = draftRef.current;
    draftRef.current = null;
    commit([...shapes, d]);
  };

  const confirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const overlay = canvas.toDataURL("image/png");
      onDone(await compositeAsset(src, overlay));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="dark fixed inset-0 z-[200] flex flex-col bg-[#0a0a0a]">
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Precision edit</span>
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={`size-5 rounded-full border ${color === c ? "border-white ring-2 ring-white/40" : "border-white/20"}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn icon={Undo2} label="Undo" disabled={!past.length} onClick={undo} />
          <IconBtn icon={Redo2} label="Redo" disabled={!future.length} onClick={redo} />
          <IconBtn icon={Trash2} label="Clear" disabled={!shapes.length} onClick={() => commit([])} />
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="ml-2 rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "✓ Confirm"}
          </button>
          <IconBtn icon={X} label="Close" onClick={onClose} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* left tool rail */}
        <div className="flex flex-col items-center gap-1 border-r border-white/10 px-2 py-3">
          {TOOLS.map(({ tool: t, icon: Icon, label }) => (
            <button
              key={t}
              type="button"
              title={label}
              onClick={() => setTool(t)}
              className={`grid size-9 place-items-center rounded-lg transition-colors ${
                tool === t ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"
              }`}
            >
              <Icon className="size-5" />
            </button>
          ))}
        </div>

        {/* canvas stage */}
        <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
          <div className="relative">
            {/* biome-ignore lint/a11y/useAltText: editor asset */}
            <img
              ref={imgRef}
              src={src}
              onLoad={(e) => setSize({ w: e.currentTarget.clientWidth, h: e.currentTarget.clientHeight })}
              className="block max-h-[80vh] select-none"
              draggable={false}
            />
            {size ? (
              <canvas
                ref={canvasRef}
                width={size.w}
                height={size.h}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                className="absolute inset-0"
                style={{ width: size.w, height: size.h, cursor: tool === "select" ? "default" : "crosshair" }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Brush;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}): ReactNode {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
    >
      <Icon className="size-4" />
    </button>
  );
}
