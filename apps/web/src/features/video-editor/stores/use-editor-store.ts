"use client";

import { create } from "zustand";
import type { CategoryId } from "../types";

export type DragState = {
  kind: "playhead" | "move" | "trim-start" | "trim-end";
  clipId?: string;
  startSec?: number;
  startPx?: number;
  startIn?: number;
  startDur?: number;
  trackId?: string;
  grab?: { dx: number; dy: number; w: number; h: number };
} | null;

interface VideoEditorState {
  playhead: number;
  playing: boolean;
  pxPerSec: number;
  selection: Set<string>;
  leftCat: CategoryId;
  railCollapsed: boolean;
  exporting: boolean;
  drag: DragState;
  dragPos: { x: number; y: number } | null;
  clipMenu: { x: number; y: number; id: string } | null;

  setPlayhead: (p: number | ((prev: number) => number)) => void;
  setPlaying: (p: boolean | ((prev: boolean) => boolean)) => void;
  togglePlaying: () => void;
  setPxPerSec: (px: number | ((prev: number) => number)) => void;
  setSelection: (sel: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  selectClip: (id: string) => void;
  clearSelection: () => void;
  setLeftCat: (cat: CategoryId) => void;
  setRailCollapsed: (col: boolean | ((prev: boolean) => boolean)) => void;
  setExporting: (exp: boolean) => void;
  setDrag: (drag: DragState) => void;
  setDragPos: (pos: { x: number; y: number } | null) => void;
  setClipMenu: (menu: { x: number; y: number; id: string } | null) => void;
  resetEditorStore: () => void;
}

const initialValues = {
  playhead: 0,
  playing: false,
  pxPerSec: 48,
  selection: new Set<string>(),
  leftCat: "ai-tools" as CategoryId,
  railCollapsed: false,
  exporting: false,
  drag: null,
  dragPos: null,
  clipMenu: null,
};

export const useEditorStore = create<VideoEditorState>((set) => ({
  ...initialValues,

  setPlayhead: (p) => set((s) => ({ playhead: typeof p === "function" ? p(s.playhead) : p })),
  setPlaying: (p) => set((s) => ({ playing: typeof p === "function" ? p(s.playing) : p })),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setPxPerSec: (px) => set((s) => ({ pxPerSec: typeof px === "function" ? px(s.pxPerSec) : px })),
  setSelection: (sel) => set((s) => ({ selection: typeof sel === "function" ? sel(s.selection) : sel })),
  selectClip: (id) => set({ selection: new Set([id]) }),
  clearSelection: () => set({ selection: new Set() }),
  setLeftCat: (leftCat) => set({ leftCat }),
  setRailCollapsed: (col) => set((s) => ({ railCollapsed: typeof col === "function" ? col(s.railCollapsed) : col })),
  setExporting: (exporting) => set({ exporting }),
  setDrag: (drag) => set({ drag }),
  setDragPos: (dragPos) => set({ dragPos }),
  setClipMenu: (clipMenu) => set({ clipMenu }),
  resetEditorStore: () => set({ ...initialValues, selection: new Set<string>() }),
}));
