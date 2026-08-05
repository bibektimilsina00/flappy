"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadToProject } from "../services/video-editor-api";
import {
  addClip,
  addTrack,
  clipForAsset,
  findClip,
  freeStart,
  removeClips,
  splitClip,
  trackKindForClip,
} from "../lib/doc-ops";
import type { CategoryId, Clip, VideoEditorAsset, VideoEditorDoc } from "../types";
import { useEditor } from "./use-editor";

export function useVideoEditorPage(projectId: string) {
  const editor = useEditor(projectId);
  const { doc, assets, commit, undo, redo } = editor;

  const [leftCat, setLeftCat] = useState<CategoryId>("ai-tools");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const importInput = useRef<HTMLInputElement>(null);

  // Selected clip object helper
  const selectedClipId = selection.size === 1 ? Array.from(selection)[0] : null;
  const selectedClip = useMemo(() => {
    if (!doc || !selectedClipId) return null;
    return findClip(doc, selectedClipId)?.clip ?? null;
  }, [doc, selectedClipId]);

  // Asset URL lookup helper
  const urlOf = useCallback((id?: string) => assets.find((a) => a.id === id)?.url, [assets]);

  const setAspect = (w: number, h: number) => doc && commit({ ...doc, width: w, height: h });

  const splitSelected = useCallback((playhead: number) => {
    if (!doc || !selectedClipId) return;
    const next = splitClip(doc, selectedClipId, playhead);
    if (next !== doc) commit(next);
  }, [doc, selectedClipId, commit]);

  const addTextClip = (content: string, playhead: number) => {
    if (!doc) return;
    const kind = "text";
    let track = doc.tracks.find((t) => t.kind === kind);
    let nextDoc = doc;
    if (!track) {
      nextDoc = addTrack(doc, kind);
      track = nextDoc.tracks.find((t) => t.kind === kind)!;
    }
    const dur = 3;
    const start = freeStart(nextDoc, track.id, playhead, dur);
    const newId = `c-${crypto.randomUUID().slice(0, 8)}`;
    const clip: Clip = {
      id: newId,
      kind: "text",
      start,
      duration: dur,
      in: 0,
      out: dur,
      speed: 1,
      volume: 1,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      keyframes: [],
      effects: [],
      text: { content },
    };
    commit(addClip(nextDoc, track.id, clip));
    setSelection(new Set([newId]));
  };

  const doImport = async (file?: File, playhead = 0) => {
    if (!file || !doc) return;
    setImporting(true);
    try {
      const asset = await uploadToProject(projectId, file);
      const targetKind = trackKindForClip(asset.kind);
      let targetTrack = doc.tracks.find((t) => t.kind === targetKind);
      let updatedDoc = doc;
      if (!targetTrack) {
        updatedDoc = addTrack(doc, targetKind);
        targetTrack = updatedDoc.tracks.find((t) => t.kind === targetKind)!;
      }
      const clip = clipForAsset(asset, playhead);
      const inserted = addClip(updatedDoc, targetTrack.id, clip);
      commit(inserted);
      setSelection(new Set([clip.id]));
    } finally {
      setImporting(false);
    }
  };

  const dropAsset = (assetId: string, dropTime: number, rowTrackId: string | null) => {
    if (!doc) return;
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const targetKind = trackKindForClip(asset.kind);
    let track = rowTrackId ? doc.tracks.find((t) => t.id === rowTrackId) : doc.tracks.find((t) => t.kind === targetKind);
    let nextDoc = doc;
    if (!track) {
      nextDoc = addTrack(doc, targetKind);
      track = nextDoc.tracks.find((t) => t.kind === targetKind)!;
    }
    const clip = clipForAsset(asset, Math.max(0, dropTime));
    commit(addClip(nextDoc, track.id, clip));
    setSelection(new Set([clip.id]));
  };

  // Keyboard shortcut listener
  const setupKeybindings = useCallback(
    (togglePlay: () => void, playhead: number) => {
      const onKey = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
        if (e.key === " " || e.code === "Space") {
          e.preventDefault();
          togglePlay();
        } else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          splitSelected(playhead);
        } else if ((e.key === "Delete" || e.key === "Backspace") && selection.size > 0 && doc) {
          e.preventDefault();
          commit(removeClips(doc, selection));
          setSelection(new Set());
        } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    },
    [selection, doc, commit, undo, redo, splitSelected],
  );

  return {
    ...editor,
    leftCat,
    setLeftCat,
    railCollapsed,
    setRailCollapsed,
    selection,
    setSelection,
    exporting,
    setExporting,
    importing,
    importInput,
    selectedClip,
    urlOf,
    setAspect,
    splitSelected,
    addTextClip,
    doImport,
    dropAsset,
    setupKeybindings,
  };
}
