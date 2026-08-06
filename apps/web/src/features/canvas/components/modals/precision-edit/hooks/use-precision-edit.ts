"use client";

import { useState } from "react";
import { toast } from "sonner";
import { compositeAsset } from "@/features/projects";

export type Pt = [number, number];
export type Shape =
  | { type: "pen"; color: string; width: number; pts: Pt[] }
  | { type: "rect" | "ellipse" | "arrow"; color: string; width: number; a: Pt; b: Pt }
  | { type: "text"; color: string; at: Pt; text: string };

export type Tool = "select" | "arrow" | "rect" | "ellipse" | "text" | "pen" | "eraser";

export function usePrecisionEdit(
  src: string,
  onDone: (result: { key: string; url: string }) => void,
  onClose: () => void,
) {
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#e64bd8");
  const [width, setWidth] = useState(4);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [redo, setRedo] = useState<Shape[]>([]);
  const [busy, setBusy] = useState(false);

  const pushShape = (s: Shape) => {
    setShapes((arr) => [...arr, s]);
    setRedo([]);
  };

  const undo = () => {
    setShapes((arr) => {
      if (!arr.length) return arr;
      const last = arr[arr.length - 1];
      if (last) setRedo((r) => [...r, last]);
      return arr.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedo((r) => {
      if (!r.length) return r;
      const last = r[r.length - 1];
      if (last) setShapes((arr) => [...arr, last]);
      return r.slice(0, -1);
    });
  };

  const save = async (canvasEl: HTMLCanvasElement | null) => {
    if (!canvasEl) return;
    setBusy(true);
    try {
      const dataUrl = canvasEl.toDataURL("image/png");
      const res = await compositeAsset(src, dataUrl);
      onDone(res);
      toast.success("Edits saved successfully");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save edit");
      setBusy(false);
    }
  };

  return {
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
  };
}
