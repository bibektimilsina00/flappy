"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  updateClip,
} from "../lib/doc-ops";
import { useEditorStore } from "../stores/use-editor-store";
import type { CategoryId, Clip } from "../types";
import { useEditor } from "./use-editor";

export function useVideoEditorPage(projectId: string) {
  const editor = useEditor(projectId);
  const { doc, assets, commit, undo, redo } = editor;

  // Subscribe to Zustand store for global interactive states
  const leftCat = useEditorStore((s) => s.leftCat);
  const setLeftCat = useEditorStore((s) => s.setLeftCat);
  const railCollapsed = useEditorStore((s) => s.railCollapsed);
  const setRailCollapsed = useEditorStore((s) => s.setRailCollapsed);
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const exporting = useEditorStore((s) => s.exporting);
  const setExporting = useEditorStore((s) => s.setExporting);

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

  const addTextClip = (content: string, playhead: number, style?: Partial<NonNullable<Clip["text"]>>) => {
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
      text: { content, ...style },
    };
    commit(addClip(nextDoc, track.id, clip));
    setSelection(new Set([newId]));
  };

  const addSubtitleClips = (segments: { start: number; end: number; text: string }[]) => {
    if (!doc || !segments.length) return;
    // dedicated subtitle track (reuse if present), styled bottom-center captions
    let nextDoc = doc;
    let track = nextDoc.tracks.find((t) => t.kind === "text" && t.name === "Subtitles");
    if (!track) {
      nextDoc = addTrack(nextDoc, "text");
      track = nextDoc.tracks[0];
      nextDoc = { ...nextDoc, tracks: nextDoc.tracks.map((t) => (t.id === track!.id ? { ...t, name: "Subtitles" } : t)) };
      track = nextDoc.tracks.find((t) => t.id === track!.id)!;
    }
    for (const seg of segments) {
      const dur = Math.max(0.3, seg.end - seg.start);
      const clip: Clip = {
        id: `c-${crypto.randomUUID().slice(0, 8)}`,
        kind: "text",
        start: Math.max(0, seg.start),
        duration: dur,
        in: 0,
        out: dur,
        speed: 1,
        volume: 1,
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        keyframes: [],
        effects: [],
        text: { content: seg.text, fontSize: 40, bold: true, align: "center" },
      };
      nextDoc = addClip(nextDoc, track.id, clip);
    }
    commit(nextDoc);
  };

  // Mute the source video clip and drop the extracted audio as its own clip,
  // aligned to the video's timeline position.
  const detachAudioClip = (videoClipId: string, assetId: string) => {
    if (!doc) return;
    const src = doc.tracks.flatMap((t) => t.clips).find((c) => c.id === videoClipId);
    if (!src) return;
    let nextDoc = updateClip(doc, videoClipId, { volume: 0 });
    let track = nextDoc.tracks.find((t) => t.kind === "audio");
    if (!track) {
      nextDoc = addTrack(nextDoc, "audio");
      track = nextDoc.tracks.find((t) => t.kind === "audio")!;
    }
    const start = freeStart(nextDoc, track.id, src.start, src.duration);
    const clip: Clip = {
      id: `c-${crypto.randomUUID().slice(0, 8)}`,
      assetId,
      kind: "audio",
      start,
      duration: src.duration,
      in: 0,
      out: src.duration,
      speed: 1,
      volume: 1,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      keyframes: [],
      effects: [],
    };
    commit(addClip(nextDoc, track.id, clip));
  };

  const addShapeClip = (shape: NonNullable<Clip["shape"]>, playhead: number) => {
    if (!doc) return;
    let track = doc.tracks.find((t) => t.kind === "video");
    let nextDoc = doc;
    if (!track) {
      nextDoc = addTrack(doc, "video");
      track = nextDoc.tracks.find((t) => t.kind === "video")!;
    }
    const dur = 3;
    const start = freeStart(nextDoc, track.id, playhead, dur);
    const newId = `c-${crypto.randomUUID().slice(0, 8)}`;
    const clip: Clip = {
      id: newId,
      kind: "shape",
      start,
      duration: dur,
      in: 0,
      out: dur,
      speed: 1,
      volume: 1,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      keyframes: [],
      effects: [],
      shape,
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

  // Add a clip for a freshly-imported asset (id may not be in the pool yet).
  const addImportedClip = (assetId: string, kind: string, dropTime: number) => {
    if (!doc) return;
    const targetKind = trackKindForClip(kind);
    let track = doc.tracks.find((t) => t.kind === targetKind);
    let nextDoc = doc;
    if (!track) {
      nextDoc = addTrack(doc, targetKind);
      track = nextDoc.tracks.find((t) => t.kind === targetKind)!;
    }
    const clip = clipForAsset({ id: assetId, kind, url: "" }, Math.max(0, dropTime));
    commit(addClip(nextDoc, track.id, clip));
    setSelection(new Set([clip.id]));
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
    [selection, doc, commit, undo, redo, splitSelected, setSelection],
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
    addShapeClip,
    addSubtitleClips,
    addImportedClip,
    detachAudioClip,
    doImport,
    dropAsset,
    setupKeybindings,
  };
}
