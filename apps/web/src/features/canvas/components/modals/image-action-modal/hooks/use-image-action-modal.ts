"use client";

import { useState } from "react";
import { toast } from "sonner";
import { editAsset } from "@/features/projects";
import { useCanvasActions } from "../../../canvas-actions";

export type Result = { key: string; url: string };

export type ImageAction =
  | "Extract from grid"
  | "Light tune"
  | "Expand image"
  | "Three-view diagram"
  | "Multi-angle views"
  | "Change angle"
  | "Image 1, 9-frame deduction"
  | "Storyboard 25-grid";

export function useImageActionModal(sourceId: string, src: string, onClose: () => void) {
  const { addImageResults } = useCanvasActions();
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<Result[]>) => {
    setBusy(true);
    try {
      const results = await task();
      addImageResults(sourceId, results);
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      toast.error(message);
      setBusy(false);
    }
  };

  const runEdit = (prompt: string, size?: string) =>
    run(async () => [await editAsset(src, prompt, size ? { size } : undefined)]);

  return { busy, run, runEdit };
}
