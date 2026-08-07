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
import { type Pt, type Shape, type Tool, usePrecisionEdit } from "./hooks/use-precision-edit";

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
      const w = s.b[0] - s.a[0];
      const h = s.b[1] - s.a[1];
      ctx.strokeRect(s.a[0], s.a[1], w, h);
    } else if (s.type === "ellipse") {
      ctx.lineWidth = s.width;
      const rx = Math.abs(s.b[0] - s.a[0]) / 2;
      const ry = Math.abs(s.b[1] - s.a[1]) / 2;
      const cx = s.a[0] + (s.b[0] - s.a[0]) / 2;
      const cy = s.a[1] + (s.b[1] - s.a[1]) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === "arrow") {
      ctx.lineWidth = s.width;
      const [x1, y1] = s.a;
      const [x2, y2] = s.b;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 12;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    } else if (s.type === "text") {
      ctx.font = "16px sans-serif";
      ctx.fillText(s.text, s.at[0], s.at[1]);
    }
  }
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
  const {
    tool,
    setTool,
    color,
    setColor,
    width,
    setWidth,
    shapes,
    setShapes,
    redo,
    busy,
    pushShape,
    undo,
    handleRedo,
    save,
  } = usePrecisionEdit(src, onDone, onClose);

  const [draft, setDraft] = useState<Shape | null>(null);
  const [textInput, setTextInput] = useState<{ at: Pt; text: string } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    draw(ctx, draft ? [...shapes, draft] : shapes);
  }, [shapes, draft]);

  const pos = (e: React.MouseEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    const scaleX = natural ? natural.w / r.width : 1;
    const scaleY = natural ? natural.h / r.height : 1;
    return [(e.clientX - r.left) * scaleX, (e.clientY - r.top) * scaleY];
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    if (tool === "pen") setDraft({ type: "pen", color, width, pts: [p] });
    else if (tool === "rect" || tool === "ellipse" || tool === "arrow")
      setDraft({ type: tool, color, width, a: p, b: p });
    else if (tool === "text") setTextInput({ at: p, text: "" });
    else if (tool === "eraser") {
      setShapes((arr) => arr.filter((s) => !hitShape(s, p)));
    }
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draft) return;
    const p = pos(e);
    if (draft.type === "pen") setDraft({ ...draft, pts: [...draft.pts, p] });
    else if (draft.type === "rect" || draft.type === "ellipse" || draft.type === "arrow")
      setDraft({ ...draft, b: p });
  };

  const onUp = () => {
    if (draft) {
      pushShape(draft);
      setDraft(null);
    }
  };

  const commitText = () => {
    if (textInput?.text.trim()) {
      pushShape({ type: "text", color, at: textInput.at, text: textInput.text.trim() });
    }
    setTextInput(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex h-[90vh] w-[90vw] max-w-6xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Precision Edit</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!shapes.length}
              onClick={undo}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              disabled={!redo.length}
              onClick={handleRedo}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <Redo2 className="size-4" />
            </button>
            <button
              type="button"
              disabled={!shapes.length}
              onClick={() => setShapes([])}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>

            <div className="mx-2 h-4 w-px bg-border" />

            <button
              type="button"
              disabled={busy}
              onClick={() => void save(canvasRef.current)}
              className="rounded-xl bg-teal-400 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-300 disabled:opacity-50"
            >
              Save Edits
            </button>

            <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:text-foreground">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Canvas */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col gap-3 border-r border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-1">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.tool}
                    type="button"
                    onClick={() => setTool(t.tool)}
                    className={`flex items-center gap-2 rounded-xl p-2 text-xs font-medium transition-colors ${
                      tool === t.tool ? "bg-teal-400 text-black" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`size-6 rounded-full border transition-transform ${
                    color === c ? "scale-110 border-white shadow" : "border-transparent hover:scale-105"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center bg-black/50 p-4">
            <img
              src={src}
              alt="Source"
              onLoad={(e) => {
                const img = e.currentTarget;
                setNatural({ w: img.naturalWidth, h: img.naturalHeight });
                if (canvasRef.current) {
                  canvasRef.current.width = img.naturalWidth;
                  canvasRef.current.height = img.naturalHeight;
                }
              }}
              className="max-h-full max-w-full object-contain"
            />
            <canvas
              ref={canvasRef}
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              className="absolute max-h-full max-w-full cursor-crosshair object-contain"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function hitShape(s: Shape, [x, y]: Pt): boolean {
  if (s.type === "pen") return s.pts.some(([px, py]) => Math.hypot(px - x, py - y) < 15);
  if (s.type === "rect") {
    const minX = Math.min(s.a[0], s.b[0]);
    const maxX = Math.max(s.a[0], s.b[0]);
    const minY = Math.min(s.a[1], s.b[1]);
    const maxY = Math.max(s.a[1], s.b[1]);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }
  return false;
}
