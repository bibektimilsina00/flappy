"use client";

import {
  ArrowUp,
  Blend,
  Bookmark,
  ChevronDown,
  Copy,
  Cloud,
  Crop,
  Download,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  Maximize2,
  Mic,
  MousePointer2,
  Music,
  PanelRight,
  Pause,
  Pencil,
  Play,
  Plus,
  Redo2,
  Scissors,
  Search,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useBalance } from "@/features/billing";
import { ModelSelector, useModels } from "@/features/models";
import type { Model } from "@/features/models";
import { EditorModeTabs } from "@/shared/components/editor-mode-tabs";
import { renderEditorProject, saveEditorProject, uploadToProject } from "./api";
import { type GenBody, useGeneration } from "./use-generation";
import {
  addClip,
  addTrack,
  changeDuration,
  clipForAsset,
  duplicateClip,
  emptyTrack,
  findClip,
  freeStart,
  insertMove,
  moveClip,
  removeClips,
  removeTrack,
  splitClip,
  trackKindForClip,
  trimClip,
  uid,
  updateClip,
  updateTrack,
  updateTransform,
} from "./doc-ops";
import type { Clip, VideoEditorAsset, VideoEditorDoc, Track } from "./types";
import { useEditor } from "./use-editor";

const LEFT_TABS = [
  { id: "Media", icon: Play },
  { id: "Text", icon: Type },
  { id: "Effects", icon: Blend },
  { id: "Transitions", icon: Film },
] as const;
const RIGHT_TABS = ["Assistant", "Image", "Video"] as const;
const ASSIST_SUGGESTIONS = [
  "a drone shot flying over neon Tokyo at night",
  "a cute corgi running on the beach, slow motion",
  "product photo of a matte black bottle on marble",
  "a looping animation of ocean waves at sunset",
] as const;

const HEADER_W = 128;
const TRACK_H = 52;
const RULER_H = 26;
const CARD = "rounded-xl border border-border bg-card";
const ACCENT = "#14b8a6"; // teal-500 — matches the workflow editor pan/select control

const laneOf = (kind: string) => (kind === "audio" ? "audio" : kind === "text" ? "text" : "visual");

const ASPECTS = [
  { label: "9:16", w: 1080, h: 1920 },
  { label: "4:5", w: 1080, h: 1350 },
  { label: "1:1", w: 1080, h: 1080 },
  { label: "16:9", w: 1920, h: 1080 },
] as const;

type Drag =
  | { kind: "playhead" }
  | {
      kind: "move" | "trim-start" | "trim-end";
      clipId: string;
      base: VideoEditorDoc;
      startX: number;
      snaps: number[];
      grab?: { dx: number; dy: number; w: number; h: number };
    };

export function VideoEditorPage({ projectId }: { projectId: string }) {
  const { project, assets, doc, setTitle, saveState, commit, startGesture, preview, endGesture, undo, redo, canUndo, canRedo } =
    useEditor(projectId);
  const qc = useQueryClient();
  const [importing, setImporting] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const [leftTab, setLeftTab] = useState<(typeof LEFT_TABS)[number]["id"]>("Media");
  const [rightTab, setRightTab] = useState<(typeof RIGHT_TABS)[number]>("Assistant");
  const [pxPerSec, setPxPerSec] = useState(44);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [clipMenu, setClipMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [guide, setGuide] = useState<number | null>(null); // snap guide-line time while dragging
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null); // floating clip position
  const [ghost, setGhost] = useState<{ trackId: string; start: number; duration: number } | null>(null); // landing outline
  const [exportState, setExportState] = useState<"idle" | "rendering" | { url: string } | { error: string }>("idle");
  const laneRef = useRef<HTMLButtonElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const [viewportW, setViewportW] = useState(0);

  // Callback ref: the timeline scroll node only mounts after the project loads (past the
  // loading guard), so attach the observer when it actually appears — an [] effect would
  // have run on the loading render and never re-fire.
  const scrollCb = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportW(el.clientWidth));
    ro.observe(el);
    setViewportW(el.clientWidth);
    roRef.current = ro;
  }, []);

  const total = Math.max(doc?.duration ?? 0, 10);
  const urlOf = useCallback((id?: string) => assets.find((a) => a.id === id)?.url, [assets]);

  const doImport = useCallback(
    async (file?: File) => {
      if (!file) return;
      setImporting(true);
      try {
        await uploadToProject(projectId, file);
        // refresh the editor pool, and the canvas graph (new upload node) + thumbnails.
        await qc.invalidateQueries({ queryKey: ["editor-project", projectId] });
        qc.invalidateQueries({ queryKey: ["workflow", projectId] });
        qc.invalidateQueries({ queryKey: ["workflows"] });
      } catch (e) {
        alert(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setImporting(false);
      }
    },
    [projectId, qc],
  );

  // Time under the pointer, measured from the ruler-lane origin (past the sticky header column).
  const xToTime = useCallback(
    (clientX: number) => {
      const rect = laneRef.current?.getBoundingClientRect();
      return rect ? Math.max(0, (clientX - rect.left) / pxPerSec) : 0;
    },
    [pxPerSec],
  );

  // ── play loop ──
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPlayhead((p) => {
        const np = p + dt;
        if (np >= total) {
          setPlaying(false);
          return total;
        }
        return np;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && playhead >= total) setPlayhead(0);
      return !p;
    });
  }, [playhead, total]);

  // ── timeline drag ──
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      if (drag.kind === "playhead") {
        setPlayhead(Math.min(total, xToTime(e.clientX)));
        return;
      }
      const found = findClip(drag.base, drag.clipId);
      if (!found) return;
      const dx = (e.clientX - drag.startX) / pxPerSec;
      if (drag.kind === "move") {
        setDragPos({ x: e.clientX, y: e.clientY }); // the real clip floats with the cursor
        let trackId = found.track.id;
        const row = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-track-id]");
        const tid = row?.getAttribute("data-track-id");
        const tk = tid && drag.base.tracks.find((t) => t.id === tid);
        if (tk && laneOf(tk.kind) === laneOf(found.clip.kind)) trackId = tk.id;
        // snap the insertion point to playhead / 0 / clip edges on the target track
        const raw = found.clip.start + dx;
        const dur = found.clip.duration;
        const targets = [0, playhead];
        for (const t of drag.base.tracks) if (t.id === trackId) for (const c of t.clips) if (c.id !== drag.clipId) targets.push(c.start, c.start + c.duration);
        const thr = 8 / pxPerSec;
        let desired = raw;
        let guideT: number | null = null;
        let bestDist = thr;
        for (const T of targets) {
          if (Math.abs(raw - T) < bestDist) ((bestDist = Math.abs(raw - T)), (desired = T), (guideT = T));
          if (Math.abs(raw + dur - T) < bestDist) ((bestDist = Math.abs(raw + dur - T)), (desired = T - dur), (guideT = T));
        }
        // live ripple: neighbours slide apart now to open the gap. The dragged clip's slot
        // is rendered invisible (it floats with the cursor); the ghost outlines the landing.
        const resolved = insertMove(drag.base, drag.clipId, desired, trackId);
        preview(resolved);
        const moved = findClip(resolved, drag.clipId);
        if (moved) setGhost({ trackId: moved.track.id, start: moved.clip.start, duration: moved.clip.duration });
        setGuide(guideT);
      } else if (drag.kind === "trim-start") {
        const ns = snap(found.clip.start + dx, drag.snaps, pxPerSec);
        preview(trimClip(drag.base, drag.clipId, "start", ns - found.clip.start));
        setGuide(ns);
      } else {
        const end = found.clip.start + found.clip.duration;
        const ne = snap(end + dx, drag.snaps, pxPerSec);
        preview(trimClip(drag.base, drag.clipId, "end", ne - end));
        setGuide(ne);
      }
    };
    const onUp = () => {
      if (drag.kind !== "playhead") endGesture(true); // move + trim both previewed live → one undo step
      setDrag(null);
      setGuide(null);
      setGhost(null);
      setDragPos(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, pxPerSec, total, playhead, xToTime, preview, endGesture]);

  const beginClipDrag = useCallback(
    (e: React.PointerEvent, clip: Clip, kind: "move" | "trim-start" | "trim-end") => {
      if (!doc) return;
      e.stopPropagation();
      setSelection((s) => (e.shiftKey ? new Set(s).add(clip.id) : new Set([clip.id])));
      startGesture(); // move + trim both preview live and commit as one undo step on release
      const r = e.currentTarget.getBoundingClientRect();
      const grab = { dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height };
      setDrag({ kind, clipId: clip.id, base: doc, startX: e.clientX, snaps: snapPoints(doc, clip.id), grab });
    },
    [doc, startGesture],
  );

  const splitSelected = useCallback(() => {
    if (!doc || !selection.size) return;
    let next = doc;
    for (const id of selection) next = splitClip(next, id, playhead);
    if (next !== doc) commit(next);
  }, [doc, selection, playhead, commit]);

  const deleteSelected = useCallback(() => {
    if (!doc || !selection.size) return;
    commit(removeClips(doc, selection));
    setSelection(new Set());
  }, [doc, selection, commit]);

  const duplicateSelected = useCallback(() => {
    if (!doc || !selection.size) return;
    let d = doc;
    const created: string[] = [];
    for (const id of selection) {
      const r = duplicateClip(d, id);
      d = r.doc;
      created.push(r.newId);
    }
    commit(d);
    setSelection(new Set(created));
  }, [doc, selection, commit]);

  const addNewTrack = useCallback((kind: string) => doc && commit(addTrack(doc, kind)), [doc, commit]);

  const dropAsset = useCallback(
    (assetId: string, clientX: number, trackId: string | null) => {
      if (!doc) return;
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;
      const clip = clipForAsset(asset, xToTime(clientX));
      const wantKind = trackKindForClip(clip.kind);
      let d = doc;

      // Target: the dropped-on track if it's empty or lane-compatible; else any empty
      // track; else a lane-compatible track; else a brand-new track.
      const dropped = trackId ? d.tracks.find((t) => t.id === trackId) : undefined;
      let target =
        dropped && (dropped.clips.length === 0 || laneOf(dropped.kind) === laneOf(clip.kind)) ? dropped : undefined;
      target ??= d.tracks.find((t) => t.clips.length === 0) ?? d.tracks.find((t) => laneOf(t.kind) === laneOf(clip.kind));
      if (!target) {
        d = { ...d, tracks: [...d.tracks, emptyTrack(wantKind)] };
        target = d.tracks[d.tracks.length - 1];
      }
      // an empty track adopts the media's kind
      if (target.clips.length === 0 && target.kind !== wantKind) d = updateTrack(d, target.id, { kind: wantKind });

      clip.start = freeStart(d, target.id, clip.start, clip.duration);
      d = addClip(d, target.id, clip);

      // keep a trailing empty add-slot: if we filled the last track, append a new empty one
      if (d.tracks[d.tracks.length - 1]?.id === target.id) d = { ...d, tracks: [...d.tracks, emptyTrack("video")] };

      commit(d);
      setSelection(new Set([clip.id]));
    },
    [doc, assets, xToTime, commit],
  );

  const addTextClip = useCallback(() => {
    if (!doc) return;
    let d = doc;
    let track = d.tracks.find((t) => t.kind === "text");
    if (!track) {
      track = { id: uid(), kind: "text", name: "T1", locked: false, hidden: false, muted: false, clips: [] };
      d = { ...d, tracks: [...d.tracks, track] };
    }
    const clip: Clip = {
      id: uid(),
      kind: "text",
      start: playhead,
      duration: 3,
      in: 0,
      out: 3,
      speed: 1,
      volume: 0,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      keyframes: [],
      effects: [],
      text: { content: "New text" },
    };
    commit(addClip(d, track.id, clip));
    setSelection(new Set([clip.id]));
  }, [doc, playhead, commit]);

  const setAspect = useCallback((w: number, h: number) => doc && commit({ ...doc, width: w, height: h }), [doc, commit]);

  const doExport = useCallback(async () => {
    if (!project || !doc) return;
    setExportState("rendering");
    try {
      await saveEditorProject(project.id, { doc });
      const res = await renderEditorProject(project.id);
      setExportState({ url: res.url });
    } catch (e) {
      setExportState({ error: e instanceof Error ? e.message : "Render failed" });
    }
  }, [project, doc]);

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "s" && !mod) {
        splitSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, togglePlay, splitSelected, deleteSelected, duplicateSelected]);

  if (!doc || !project) {
    return (
      <div className="grid h-full w-full place-items-center bg-card text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const selectedClip = selection.size === 1 ? (findClip(doc, [...selection][0])?.clip ?? null) : null;
  const toggleTrack = (t: Track, patch: Partial<Track>) => commit(updateTrack(doc, t.id, patch));

  // Lane width fills the viewport (or the content, whichever is longer); ruler ticks span it.
  const tickCount = Math.ceil(Math.max(total * pxPerSec, Math.max(0, viewportW - HEADER_W)) / pxPerSec) + 1;
  const laneW = tickCount * pxPerSec;

  return (
    <div className="flex h-full w-full flex-col text-foreground">
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        {/* ── top bar ── */}
        <header className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <input
              value={project.title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-64 rounded bg-transparent px-1 text-[15px] font-semibold outline-none focus:bg-secondary"
            />
            <Pencil className="size-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cloud className="size-3.5" />
              {saveState === "saving" ? "Saving…" : "All changes saved"}
            </span>
            {typeof exportState === "object" && "url" in exportState ? (
              <a href={exportState.url} download className="flex items-center gap-1.5 text-xs font-medium" style={{ color: ACCENT }}>
                <Download className="size-3.5" /> Download MP4
              </a>
            ) : null}
            {typeof exportState === "object" && "error" in exportState ? (
              <span className="max-w-40 truncate text-xs text-red-400" title={exportState.error}>
                {exportState.error}
              </span>
            ) : null}
            <button type="button" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <PanelRight className="size-4" />
            </button>
            <button type="button" className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent">
              <Share2 className="size-4" /> Share
            </button>
            <button
              type="button"
              onClick={doExport}
              disabled={exportState === "rendering"}
              className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {exportState === "rendering" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exportState === "rendering" ? "Rendering…" : "Export"}
            </button>
          </div>
        </header>

        {/* ── panels ── */}
        <div className="flex min-h-0 flex-1 gap-2">
          {/* left */}
          <aside className={cn(CARD, "flex w-72 shrink-0 flex-col")}>
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border px-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {LEFT_TABS.map((t) => (
                <TabBtn key={t.id} active={leftTab === t.id} onClick={() => setLeftTab(t.id)} icon={t.icon}>
                  {t.id}
                </TabBtn>
              ))}
            </div>
            <input
              ref={importInput}
              type="file"
              accept="image/*,video/*,audio/*"
              hidden
              onChange={(e) => {
                doImport(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
              {leftTab === "Media" ? (
                <MediaPanel assets={assets} onImport={() => importInput.current?.click()} importing={importing} />
              ) : leftTab === "Text" ? (
                <button
                  type="button"
                  onClick={addTextClip}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:bg-accent"
                >
                  <Plus className="size-4" /> Add text
                </button>
              ) : (
                <p className="px-1 py-3 text-sm text-muted-foreground">{leftTab} — coming soon.</p>
              )}
            </div>
          </aside>

          {/* center preview */}
          <main className={cn(CARD, "flex min-w-0 flex-1 flex-col gap-3 p-4")}>
            <Preview doc={doc} urlOf={urlOf} playhead={playhead} playing={playing} />
            <div className="flex w-full items-center justify-between px-2">
              <span className="rounded-md border border-border px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
                {tc(playhead, doc.fps)} <span style={{ color: ACCENT }}>/ {tc(doc.duration, doc.fps)}</span>
              </span>
              <button
                type="button"
                onClick={togglePlay}
                className="grid size-9 place-items-center rounded-full border border-border hover:bg-accent"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconBtn title="Crop">
                  <Crop className="size-4" />
                </IconBtn>
                <IconBtn title="Fullscreen">
                  <Maximize2 className="size-4" />
                </IconBtn>
              </div>
            </div>
          </main>

          {/* right */}
          <aside className={cn(CARD, "flex w-80 shrink-0 flex-col")}>
            {selectedClip ? (
              <Inspector
                key={selectedClip.id}
                clip={selectedClip}
                doc={doc}
                startGesture={startGesture}
                preview={preview}
                endGesture={endGesture}
                onClose={() => setSelection(new Set())}
              />
            ) : (
              <>
                <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border px-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {RIGHT_TABS.map((t) => (
                    <TabBtn key={t} active={rightTab === t} onClick={() => setRightTab(t)} icon={t === "Image" ? ImageIcon : t === "Video" ? Film : Sparkles}>
                      {t}
                    </TabBtn>
                  ))}
                </div>
                <AiPanel
                  tab={rightTab}
                  projectId={projectId}
                  assets={assets}
                  selectedClip={selectedClip}
                  onGenerated={() => setLeftTab("Media")}
                  gotoTab={setRightTab}
                />
              </>
            )}
          </aside>
        </div>

        {/* ── timeline ── */}
        <div className={cn(CARD, "flex h-64 shrink-0 flex-col")}>
          {/* toolbar */}
          <div className="flex items-center gap-1 border-b border-border px-3 py-2 text-muted-foreground">
            <button type="button" className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">
              <MousePointer2 className="size-3.5" />
              <ChevronDown className="size-3" />
            </button>
            <Sep />
            <IconBtn title="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>
              <Undo2 className="size-4" />
            </IconBtn>
            <IconBtn title="Redo (⌘⇧Z)" onClick={redo} disabled={!canRedo}>
              <Redo2 className="size-4" />
            </IconBtn>
            <IconBtn title="Split (S)" onClick={splitSelected} disabled={!selection.size}>
              <Scissors className="size-4" />
            </IconBtn>
            <IconBtn title="Delete (⌫)" onClick={deleteSelected} disabled={!selection.size}>
              <Trash2 className="size-4" />
            </IconBtn>
            <IconBtn title="Duplicate (⌘D)" onClick={duplicateSelected} disabled={!selection.size}>
              <Copy className="size-4" />
            </IconBtn>
            <IconBtn title="Marker">
              <Bookmark className="size-4" />
            </IconBtn>
            <Sep />
            <AddTrackMenu onAdd={addNewTrack} />

            <div className="ml-auto flex items-center gap-1">
              <div className="mr-1 flex items-center gap-0.5 rounded-md border border-border p-0.5">
                {ASPECTS.map((a) => {
                  const active = Math.abs(doc.width / doc.height - a.w / a.h) < 0.01;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => setAspect(a.w, a.h)}
                      className={cn("rounded px-1.5 py-0.5 text-[11px] tabular-nums", active ? "text-white" : "hover:text-foreground")}
                      style={active ? { backgroundColor: ACCENT } : undefined}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
              <IconBtn title="Voiceover">
                <Mic className="size-4" />
              </IconBtn>
              <IconBtn title="Detach audio">
                <Link2 className="size-4" />
              </IconBtn>
              <IconBtn title="Thumbnails">
                <Film className="size-4" />
              </IconBtn>
              <Sep />
              <IconBtn title="Zoom out" onClick={() => setPxPerSec((p) => Math.max(12, p / 1.4))}>
                <ZoomOut className="size-4" />
              </IconBtn>
              <input
                type="range"
                min={12}
                max={200}
                value={pxPerSec}
                onChange={(e) => setPxPerSec(Number(e.target.value))}
                className="h-1 w-24 accent-[#14b8a6]"
              />
              <IconBtn title="Zoom in" onClick={() => setPxPerSec((p) => Math.min(200, p * 1.4))}>
                <ZoomIn className="size-4" />
              </IconBtn>
            </div>
          </div>

          {/* body: single scroll container, sticky-top ruler + sticky-left headers */}
          <div ref={scrollCb} className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
            <div
              className="relative select-none"
              style={{ width: HEADER_W + laneW }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("asset-id");
                const row = (e.target as HTMLElement).closest("[data-track-id]");
                if (id) dropAsset(id, e.clientX, row?.getAttribute("data-track-id") ?? null);
              }}
            >
              {/* ruler row */}
              <div className="sticky top-0 z-20 flex" style={{ height: RULER_H }}>
                <div className="sticky left-0 z-40 shrink-0 border-b border-r border-border bg-card" style={{ width: HEADER_W }} />
                <button
                  type="button"
                  ref={laneRef}
                  className="relative flex shrink-0 items-end border-b border-border bg-card text-left text-[10px] text-muted-foreground"
                  style={{ width: laneW, height: RULER_H }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setPlayhead(Math.min(total, xToTime(e.clientX)));
                    setDrag({ kind: "playhead" });
                  }}
                >
                  {Array.from({ length: tickCount }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed ruler ticks
                    <span key={i} className="relative flex shrink-0 items-end" style={{ width: pxPerSec, height: RULER_H }}>
                      <span className="absolute left-1 top-0.5">{String(i).padStart(2, "0")}.00</span>
                      <span className="absolute bottom-0 left-0 h-2 w-px bg-white/20" />
                      {[1, 2, 3, 4].map((k) => (
                        <span key={k} className="absolute bottom-0 h-1 w-px bg-muted" style={{ left: (pxPerSec * k) / 5 }} />
                      ))}
                    </span>
                  ))}
                </button>
              </div>

              {/* track rows */}
              {doc.tracks.map((track) => (
                <div key={track.id} className="group/track flex border-b border-border" style={{ height: TRACK_H }}>
                  <div className="sticky left-0 z-30 flex shrink-0 items-center gap-1 border-r border-border bg-card px-3" style={{ width: HEADER_W }}>
                    <IconBtn title={track.locked ? "Unlock" : "Lock"} onClick={() => toggleTrack(track, { locked: !track.locked })}>
                      <Lock className={cn("size-3.5", track.locked && "text-[#14b8a6]")} />
                    </IconBtn>
                    <IconBtn title={track.hidden ? "Show" : "Hide"} onClick={() => toggleTrack(track, { hidden: !track.hidden })}>
                      {track.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </IconBtn>
                    <IconBtn title={track.muted ? "Unmute" : "Mute"} onClick={() => toggleTrack(track, { muted: !track.muted })}>
                      {track.muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                    </IconBtn>
                    {doc.tracks.length > 1 ? (
                      <button
                        type="button"
                        title="Remove track"
                        onClick={() => commit(removeTrack(doc, track.id))}
                        className="ml-auto grid size-6 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover/track:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div
                    data-track-id={track.id}
                    data-lane
                    className="relative shrink-0"
                    style={{ width: laneW }}
                    onPointerDown={(e) => {
                      if ((e.target as HTMLElement).dataset.lane !== undefined) {
                        setSelection(new Set());
                        setPlayhead(Math.min(total, xToTime(e.clientX)));
                        setDrag({ kind: "playhead" });
                      }
                    }}
                  >
                    {track.clips.map((clip) => (
                      <ClipBar
                        key={clip.id}
                        clip={clip}
                        url={urlOf(clip.assetId)}
                        trackKind={track.kind}
                        pxPerSec={pxPerSec}
                        selected={selection.has(clip.id)}
                        dimmed={drag?.kind === "move" && drag.clipId === clip.id}
                        animate={drag?.kind === "move"}
                        onBody={(e) => beginClipDrag(e, clip, "move")}
                        onTrimStart={(e) => beginClipDrag(e, clip, "trim-start")}
                        onTrimEnd={(e) => beginClipDrag(e, clip, "trim-end")}
                        onContext={(e) => {
                          e.preventDefault();
                          setSelection(new Set([clip.id]));
                          setClipMenu({ x: e.clientX, y: e.clientY, id: clip.id });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* empty state: drop hint over the lanes */}
              {doc.tracks.every((t) => t.clips.length === 0) ? (
                <div
                  className="pointer-events-none absolute z-10 flex items-center justify-center rounded-xl bg-secondary/40 text-sm text-muted-foreground"
                  style={{ left: HEADER_W + 8, right: 8, top: RULER_H + 8, bottom: 8 }}
                >
                  <span className="flex items-center gap-2">
                    <Film className="size-4" /> Drag and drop media here
                  </span>
                </div>
              ) : null}

              {/* ghost outline over the open gap while moving a clip */}
              {ghost
                ? (() => {
                    const ti = doc.tracks.findIndex((t) => t.id === ghost.trackId);
                    if (ti < 0) return null;
                    return (
                      <div
                        className="pointer-events-none absolute z-30 rounded-sm border-2 border-dashed border-[#14b8a6] bg-[#14b8a6]/15 transition-[left,top,width] duration-150 ease-out"
                        style={{
                          left: HEADER_W + ghost.start * pxPerSec,
                          width: Math.max(20, ghost.duration * pxPerSec),
                          top: RULER_H + ti * TRACK_H + 6,
                          height: TRACK_H - 12,
                        }}
                      />
                    );
                  })()
                : null}

              {/* snap guide-line while dragging a clip */}
              {guide != null ? (
                <div className="pointer-events-none absolute inset-y-0 z-40 w-0.5 bg-[#14b8a6]" style={{ left: HEADER_W + guide * pxPerSec }} />
              ) : null}

              {/* playhead (offset past the sticky header column) */}
              <div className="pointer-events-none absolute inset-y-0 z-20 w-px" style={{ left: HEADER_W + playhead * pxPerSec, backgroundColor: ACCENT }}>
                <svg className="absolute -left-[6px] top-0" width="13" height="17" viewBox="0 0 13 17" fill={ACCENT} aria-hidden="true">
                  <path d="M2 1 Q1 1 1 2 L1 9 Q1 10 1.6 10.6 L5.6 15.4 Q6.5 16.4 7.4 15.4 L11.4 10.6 Q12 10 12 9 L12 2 Q12 1 11 1 Z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* the real clip, lifted off and floating with the cursor */}
      {drag?.kind === "move" && drag.grab && dragPos
        ? (() => {
            const f = findClip(doc, drag.clipId);
            if (!f) return null;
            const url = urlOf(f.clip.assetId);
            const k = f.clip.kind;
            return (
              <div
                className="pointer-events-none fixed z-[60] overflow-hidden rounded-sm border border-[#14b8a6] bg-[#2a2a2a] opacity-90 shadow-2xl"
                style={{ left: dragPos.x - drag.grab.dx, top: dragPos.y - drag.grab.dy, width: drag.grab.w, height: drag.grab.h }}
              >
                {k === "image" && url ? (
                  <div className="absolute inset-0" style={{ backgroundImage: `url(${url})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }} />
                ) : k === "video" && url ? (
                  // biome-ignore lint/a11y/useMediaCaption: drag preview
                  <video className="absolute inset-0 size-full object-cover" src={`${url}#t=0.1`} muted preload="metadata" playsInline />
                ) : (
                  <span className="absolute inset-0 flex items-center truncate px-2 text-xs text-white">{f.clip.text?.content ?? k}</span>
                )}
              </div>
            );
          })()
        : null}

      {clipMenu ? (
        <ClipContextMenu
          x={clipMenu.x}
          y={clipMenu.y}
          onClose={() => setClipMenu(null)}
          onDuplicate={() => {
            const r = duplicateClip(doc, clipMenu.id);
            commit(r.doc);
            setSelection(new Set([r.newId]));
          }}
          onSplit={() => {
            const next = splitClip(doc, clipMenu.id, playhead);
            if (next !== doc) commit(next);
          }}
          onDelete={() => {
            commit(removeClips(doc, new Set([clipMenu.id])));
            setSelection(new Set());
          }}
        />
      ) : null}

      {/* ── bottom mode tab bar (flush) ── */}
      <EditorModeTabs projectId={projectId} mode="video" />
    </div>
  );
}

// ── add-track dropdown ──────────────────────────────────────
function AddTrackMenu({ onAdd }: { onAdd: (kind: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="size-3.5" /> Track
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1 w-32 rounded-lg border border-border bg-secondary p-1 shadow-xl">
          {[
            { k: "video", label: "Video", Icon: Film },
            { k: "audio", label: "Audio", Icon: Music },
            { k: "text", label: "Text", Icon: Type },
          ].map(({ k, label, Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onAdd(k);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── clip right-click menu ───────────────────────────────────
function ClipContextMenu({
  x,
  y,
  onClose,
  onDuplicate,
  onSplit,
  onDelete,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onDuplicate: () => void;
  onSplit: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const item = (label: string, Icon: typeof Copy, onClick: () => void, danger?: boolean) => (
    <button
      type="button"
      onClick={() => {
        onClick();
        onClose();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent",
        danger ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" /> {label}
    </button>
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stop the outside-close mousedown inside the menu
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled globally
    <div
      className="fixed z-50 w-40 rounded-lg border border-border bg-secondary p-1 shadow-xl"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {item("Duplicate", Copy, onDuplicate)}
      {item("Split at playhead", Scissors, onSplit)}
      {item("Delete", Trash2, onDelete, true)}
    </div>
  );
}

// ── media panel ─────────────────────────────────────────────
function MediaPanel({ assets, onImport, importing }: { assets: VideoEditorAsset[]; onImport: () => void; importing: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input placeholder="Search" className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
        </div>
        <button type="button" className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent">
          <ChevronDown className="size-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onImport}
          disabled={importing}
          className="grid aspect-video place-items-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-accent disabled:opacity-60"
        >
          <span className="flex flex-col items-center gap-1 text-xs">
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {importing ? "Uploading…" : "Import"}
          </span>
        </button>
        {assets.map((a, i) => (
          <div key={a.id}>
            <div
              draggable
              onDragStart={(e) => e.dataTransfer.setData("asset-id", a.id)}
              className="relative cursor-grab overflow-hidden rounded-lg border border-border active:cursor-grabbing"
              title="Drag onto the timeline"
            >
              {a.kind === "video" ? (
                // biome-ignore lint/a11y/useMediaCaption: thumbnail
                <video src={a.url} className="pointer-events-none aspect-video w-full object-cover" muted />
              ) : a.kind === "audio" ? (
                <div className="grid aspect-video w-full place-items-center bg-secondary text-muted-foreground">
                  <Music className="size-5" />
                </div>
              ) : (
                // biome-ignore lint/a11y/useAltText: thumbnail
                <img src={a.url} className="pointer-events-none aspect-video w-full object-cover" />
              )}
              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] tabular-nums text-white">{a.kind}</span>
            </div>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">Media {i + 1}</p>
          </div>
        ))}
        {assets.length === 0 ? <p className="col-span-2 px-1 py-2 text-xs text-muted-foreground">No media yet.</p> : null}
      </div>
    </div>
  );
}

// ── AI generate panel (Text/Image to Video) ─────────────────
// ── AI panel: Image / Video (text→img, text→vid, img→vid, extend) / Assistant ──
function AiPanel({
  tab,
  projectId,
  assets,
  selectedClip,
  onGenerated,
  gotoTab,
}: {
  tab: (typeof RIGHT_TABS)[number];
  projectId: string;
  assets: VideoEditorAsset[];
  selectedClip: Clip | null;
  onGenerated: () => void;
  gotoTab: (t: (typeof RIGHT_TABS)[number]) => void;
}) {
  const gen = useGeneration(projectId);
  const [prompt, setPrompt] = useState(""); // shared across tabs so "Edit in tab" carries over

  // Reveal the result: on completion, jump the left panel to Media (fire once per run).
  const onGenRef = useRef(onGenerated);
  onGenRef.current = onGenerated;
  const prevStatus = useRef(gen.status);
  useEffect(() => {
    if (gen.status === "done" && prevStatus.current !== "done") onGenRef.current();
    prevStatus.current = gen.status;
  }, [gen.status]);

  if (tab === "Assistant") return <AssistantPanel prompt={prompt} setPrompt={setPrompt} gen={gen} gotoTab={gotoTab} />;
  return (
    <GenPanel
      key={tab}
      kind={tab === "Image" ? "image" : "video"}
      prompt={prompt}
      setPrompt={setPrompt}
      gen={gen}
      assets={assets}
      selectedClip={selectedClip}
    />
  );
}

function GenPanel({
  kind,
  prompt,
  setPrompt,
  gen,
  assets,
  selectedClip,
}: {
  kind: "image" | "video";
  prompt: string;
  setPrompt: (v: string) => void;
  gen: ReturnType<typeof useGeneration>;
  assets: VideoEditorAsset[];
  selectedClip: Clip | null;
}) {
  const models = useModels(kind).data ?? [];
  const [modelId, setModelId] = useState("");
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [source, setSource] = useState<"text" | "image" | "extend">("text");
  const [sourceId, setSourceId] = useState<string | null>(null);

  const model: Model | undefined = models.find((m) => m.id === modelId) ?? models[0];
  useEffect(() => {
    if (!modelId && models.length) setModelId((models.find((m) => m.default) ?? models[0]).id);
  }, [models, modelId]);

  const needsSource = kind === "video" && source !== "text";
  const sourceKind = source === "extend" ? "video" : "image";
  const sourceAssets = assets.filter((a) => (sourceKind === "video" ? a.kind === "video" : a.kind === "image"));
  // default the source to the selected clip's asset when the picker becomes relevant
  useEffect(() => {
    if (!needsSource) return;
    if (sourceId && sourceAssets.some((a) => a.id === sourceId)) return;
    const fromClip = selectedClip?.assetId ? sourceAssets.find((a) => a.id === selectedClip.assetId) : undefined;
    setSourceId(fromClip?.id ?? sourceAssets[0]?.id ?? null);
  }, [needsSource, sourceKind, selectedClip?.assetId, assets, sourceId, sourceAssets]);

  const canGenerate = prompt.trim().length > 0 && !!modelId && (!needsSource || !!sourceId) && !gen.running;
  const submit = () => {
    if (!canGenerate) return;
    const body: GenBody = { kind, prompt, model: modelId, params, source_asset_id: needsSource ? sourceId : null };
    gen.run(body);
  };
  const selectParams = model?.params.filter((p) => p.type === "select" && (p.options?.length ?? 0) > 0) ?? [];

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 [scrollbar-width:thin]">
      {kind === "video" ? (
        <Field label="Source">
          <PillRow
            options={["text", "image", "extend"]}
            labels={{ text: "Text", image: "Image", extend: "Extend" }}
            value={source}
            onChange={(v) => setSource(v as "text" | "image" | "extend")}
          />
        </Field>
      ) : null}

      {needsSource ? (
        <Field label={source === "extend" ? "Video to extend" : "Source image"}>
          <AssetPicker assets={sourceAssets} value={sourceId} onChange={setSourceId} />
        </Field>
      ) : null}

      <Field label={source === "extend" ? "How to continue" : "Description"}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder={kind === "image" ? "Describe the image…" : "Describe the video…"}
          className="w-full resize-none rounded-lg border border-border bg-secondary p-2.5 text-[13px] leading-relaxed outline-none focus:border-[#14b8a6]"
        />
      </Field>

      <Field label="Model">
        {models.length ? (
          <ModelSelector models={models} value={modelId} onChange={setModelId} />
        ) : (
          <p className="text-xs text-muted-foreground">Loading models…</p>
        )}
      </Field>

      {selectParams.map((p) => (
        <Field key={p.key} label={p.label}>
          <PillRow options={p.options as string[]} value={String(params[p.key] ?? p.default)} onChange={(v) => setParams((prev) => ({ ...prev, [p.key]: v }))} />
        </Field>
      ))}

      <GenerateFooter gen={gen} onGenerate={submit} disabled={!canGenerate} />
    </div>
  );
}

function AssistantPanel({
  prompt,
  setPrompt,
  gen,
  gotoTab,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  gen: ReturnType<typeof useGeneration>;
  gotoTab: (t: (typeof RIGHT_TABS)[number]) => void;
}) {
  const imageModels = useModels("image").data ?? [];
  const videoModels = useModels("video").data ?? [];
  const isVideo = /\b(video|animat\w*|motion|clip|footage|cinematic|moving|fly\w*|drone|walk\w*|run\w*|danc\w*|zoom|pan|slow[- ]?mo)\b/i.test(prompt);
  const kind: "image" | "video" = isVideo ? "video" : "image";
  const models = kind === "video" ? videoModels : imageModels;
  const model = models.find((m) => m.free !== false && m.default) ?? models.find((m) => m.free !== false) ?? models[0];
  const canGo = prompt.trim().length > 0 && !!model && !gen.running;
  const submit = () => {
    if (canGo && model) gen.run({ kind, prompt, model: model.id, params: {} });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* scrollable content */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <Sparkles className="size-6" style={{ color: ACCENT }} />
          <p className="text-sm text-muted-foreground">Describe what you want — I'll pick the mode and a model, and generate it.</p>
        </div>
        <div className="flex flex-col gap-2">
          {ASSIST_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
        <GenStatus gen={gen} />
      </div>

      {/* input pinned to the bottom (canvas assistant style) */}
      <div className="shrink-0 p-3">
        {prompt.trim() ? (
          <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>
              Detected <span className="capitalize text-foreground">{kind}</span>
              {model ? <> · {model.name}</> : null}
            </span>
            <button type="button" onClick={() => gotoTab(kind === "video" ? "Video" : "Image")} className="hover:underline" style={{ color: ACCENT }}>
              Edit in {kind === "video" ? "Video" : "Image"}
            </button>
          </div>
        ) : null}
        <div className="rounded-2xl border border-border bg-background p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Describe what to generate…"
            className="max-h-32 w-full resize-none bg-transparent text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={!canGo}
              aria-label="Generate"
              className="flex size-7 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              {gen.running ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateFooter({ gen, onGenerate, disabled }: { gen: ReturnType<typeof useGeneration>; onGenerate: () => void; disabled: boolean }) {
  const { data: balance } = useBalance();
  return (
    <div className="space-y-2 pt-1">
      <GenStatus gen={gen} />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Credits <Sparkles className="size-3.5" style={{ color: ACCENT }} /> {balance?.balance ?? "—"}
        </span>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          {gen.running ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Generating…
            </>
          ) : (
            <>
              Generate <Sparkles className="size-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function GenStatus({ gen }: { gen: ReturnType<typeof useGeneration> }) {
  if (gen.status === "error") {
    const upgrade = /premium|plan|credit/i.test(gen.error ?? "");
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
        {gen.error}
        {upgrade ? (
          <>
            {" — "}
            <a href="/pricing" className="underline underline-offset-2">
              upgrade
            </a>
          </>
        ) : null}
      </p>
    );
  }
  if (gen.status === "done") {
    return <p className="rounded-lg border border-border bg-secondary p-2 text-xs text-muted-foreground">Added to Media — drag it onto the timeline.</p>;
  }
  return null;
}

function PillRow({ options, value, onChange, labels }: { options: string[]; value: string; onChange: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn("flex-1 truncate rounded-md py-1 text-xs capitalize tabular-nums", value === o ? "text-white" : "text-muted-foreground hover:text-foreground")}
          style={value === o ? { backgroundColor: ACCENT } : undefined}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

function AssetPicker({ assets, value, onChange }: { assets: VideoEditorAsset[]; value: string | null; onChange: (id: string) => void }) {
  if (!assets.length) {
    return <p className="rounded-lg border border-border bg-secondary p-2.5 text-xs text-muted-foreground">No matching media in this project yet.</p>;
  }
  return (
    <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto [scrollbar-width:thin]">
      {assets.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onChange(a.id)}
          className={cn("relative aspect-square overflow-hidden rounded-md border", value === a.id ? "border-2" : "border-border")}
          style={value === a.id ? { borderColor: ACCENT } : undefined}
        >
          {a.kind === "video" ? (
            // biome-ignore lint/a11y/useMediaCaption: source thumbnail
            <video className="size-full object-cover" src={`${a.url}#t=0.1`} muted preload="metadata" playsInline />
          ) : a.kind === "audio" ? (
            <span className="flex size-full items-center justify-center bg-secondary">
              <Music className="size-4 text-muted-foreground" />
            </span>
          ) : (
            // biome-ignore lint/a11y/useAltText: source thumbnail
            <img className="size-full object-cover" src={a.url} alt="" />
          )}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-medium">{label}</p>
      {children}
    </div>
  );
}

// ── preview (layered DOM, playhead-synced) ──────────────────
function Preview({
  doc,
  urlOf,
  playhead,
  playing,
}: {
  doc: VideoEditorDoc;
  urlOf: (id?: string) => string | undefined;
  playhead: number;
  playing: boolean;
}) {
  const media = useRef<Map<string, HTMLMediaElement>>(new Map());

  // Measure the available area and fit the canvas within BOTH dimensions (so wide
  // ratios like 16:9 never overflow the panel).
  const previewRo = useRef<ResizeObserver | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const fitCb = useCallback((el: HTMLDivElement | null) => {
    previewRo.current?.disconnect();
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    previewRo.current = ro;
  }, []);
  const ratio = doc.width / doc.height;
  const bw = box.w && box.h ? Math.min(box.w, box.h * ratio) : 0;
  const bh = bw / ratio;

  const layers = useMemo(() => {
    const visual: { clip: Clip; z: number }[] = [];
    const audio: { clip: Clip; track: Track }[] = [];
    doc.tracks.forEach((track, z) => {
      if (track.hidden) return;
      const hit = track.clips.find((c) => playhead >= c.start && playhead < c.start + c.duration);
      if (!hit) return;
      if (laneOf(track.kind) === "audio") audio.push({ clip: hit, track });
      else visual.push({ clip: hit, z });
    });
    return { visual, audio };
  }, [doc, playhead]);

  const activeKey = [...layers.visual, ...layers.audio].map((l) => l.clip.id).join(",");
  const all = [...layers.visual.map((l) => l.clip), ...layers.audio.map((l) => l.clip)];

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeKey subsumes clip identity
  useEffect(() => {
    for (const clip of all) {
      const el = media.current.get(clip.id);
      if (!el) continue;
      const src = Math.max(0, clip.in + (playhead - clip.start) * clip.speed);
      if (playing) {
        if (Math.abs(el.currentTime - src) > 0.3) el.currentTime = src;
        el.play().catch(() => {});
      } else {
        try {
          el.currentTime = src;
        } catch {}
        el.pause();
      }
    }
    for (const [id, el] of media.current) if (!all.some((c) => c.id === id)) el.pause();
  }, [activeKey, playing, playhead]);

  const setRef = (id: string) => (el: HTMLMediaElement | null) => {
    if (el) media.current.set(id, el);
    else media.current.delete(id);
  };

  const textLayers = layers.visual.filter((l) => l.clip.kind === "text");

  return (
    <div ref={fitCb} className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div
        className="relative overflow-hidden rounded-lg bg-black"
        style={bw ? { width: bw, height: bh } : { aspectRatio: `${doc.width} / ${doc.height}`, maxWidth: "100%", maxHeight: "100%" }}
      >
      {layers.visual.length === 0 ? (
        <div className="grid size-full place-items-center text-sm text-muted-foreground">Drop media on the timeline to preview</div>
      ) : (
        layers.visual
          .filter((l) => l.clip.kind !== "text")
          .map(({ clip, z }) => {
            const url = urlOf(clip.assetId);
            const t = clip.transform;
            const style = {
              zIndex: z,
              opacity: t.opacity,
              transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale}) rotate(${t.rotation}deg)`,
            } as const;
            if (clip.kind === "video" && url) {
              return (
                // biome-ignore lint/a11y/useMediaCaption: editor preview
                <video key={clip.id} ref={setRef(clip.id)} src={url} muted={clip.volume === 0} playsInline preload="auto" className="absolute inset-0 size-full object-contain" style={style} />
              );
            }
            return url ? (
              // biome-ignore lint/a11y/useAltText: editor preview
              <img key={clip.id} src={url} className="absolute inset-0 size-full object-contain" style={style} />
            ) : null;
          })
      )}
      {/* text as caption pill (bottom-centered) */}
      {textLayers.length ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex flex-col items-center gap-1.5 px-4">
          {textLayers.map(({ clip }) => (
            <span key={clip.id} className="rounded bg-black/70 px-3 py-1.5 text-center text-sm font-medium text-white" style={{ opacity: clip.transform.opacity }}>
              {clip.text?.content}
            </span>
          ))}
        </div>
      ) : null}
      {layers.audio.map(({ clip, track }) => {
        const url = urlOf(clip.assetId);
        return url ? (
          // biome-ignore lint/a11y/useMediaCaption: audio track
          <audio key={clip.id} ref={setRef(clip.id)} src={url} muted={track.muted} />
        ) : null;
      })}
      </div>
    </div>
  );
}

// ── clip bar (filmstrip / text / effect / waveform) ─────────
function ClipBar({
  clip,
  url,
  trackKind,
  pxPerSec,
  selected,
  dimmed,
  animate,
  onBody,
  onTrimStart,
  onTrimEnd,
  onContext,
}: {
  clip: Clip;
  url?: string;
  trackKind: string;
  pxPerSec: number;
  selected: boolean;
  dimmed?: boolean;
  animate?: boolean;
  onBody: (e: React.PointerEvent) => void;
  onTrimStart: (e: React.PointerEvent) => void;
  onTrimEnd: (e: React.PointerEvent) => void;
  onContext: (e: React.MouseEvent) => void;
}) {
  const w = Math.max(20, clip.duration * pxPerSec);
  const kind = clip.kind;
  const isMedia = kind === "video" || kind === "image";
  const isAudio = kind === "audio" || trackKind === "audio";
  const tiles = Math.max(1, Math.min(12, Math.floor(w / 80))); // filmstrip: one seeked frame per ~80px
  const span = Math.max(0.001, clip.out - clip.in);

  const base =
    kind === "text"
      ? "bg-[#1f9b9b]/85 text-white"
      : kind === "effect" || trackKind === "effect"
        ? "bg-[#c14bd6]/85 text-white"
        : isAudio
          ? "bg-[#2a2f3a] text-white"
          : "bg-[#2a2a2a] text-white";

  return (
    <div
      className={cn(
        "absolute top-1.5 flex h-[calc(100%-12px)] items-center overflow-hidden rounded-sm border text-xs",
        base,
        selected ? "ring-2" : "border-border",
        dimmed && "invisible", // the dragged clip floats with the cursor; its slot shows as the open gap
        animate && "transition-[left,width] duration-150 ease-out", // neighbours slide live to make room
      )}
      style={{ left: clip.start * pxPerSec, width: w, ...(selected ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : {}) }}
      onPointerDown={onBody}
      onContextMenu={onContext}
      title={`${kind} · ${clip.duration.toFixed(1)}s`}
    >
      {kind === "image" && url ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{ backgroundImage: `url(${url})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }}
        />
      ) : kind === "video" && url ? (
        <div className="pointer-events-none absolute inset-0 flex overflow-hidden opacity-90">
          {Array.from({ length: tiles }).map((_, i) => (
            <video
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed filmstrip cells
              // biome-ignore lint/a11y/useMediaCaption: clip thumbnail frame
              key={i}
              className="h-full min-w-0 flex-1 object-cover"
              src={`${url}#t=${(clip.in + ((i + 0.5) / tiles) * span).toFixed(2)}`}
              muted
              preload="metadata"
              playsInline
            />
          ))}
        </div>
      ) : null}
      {isAudio ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-1 top-5 opacity-60"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#9aa4b2 0 1px,transparent 1px 4px)" }}
        />
      ) : null}

      <span className="pointer-events-none relative z-[1] flex items-center gap-1.5 truncate px-2 py-1">
        {kind === "text" ? <Type className="size-3 shrink-0" /> : null}
        {kind === "effect" || trackKind === "effect" ? <Blend className="size-3 shrink-0" /> : null}
        {isAudio ? <Music className="size-3 shrink-0" /> : null}
        <span className="truncate">{clip.text?.content ?? (isAudio ? "Audio" : isMedia ? "" : kind)}</span>
      </span>

      {/* trim handles: wider invisible grab area, with a small square handle flush to the border */}
      <span className="absolute inset-y-0 left-0 z-20 flex w-2.5 cursor-ew-resize items-center justify-start" onPointerDown={onTrimStart}>
        {selected ? (
          <span className="flex h-3 w-1 items-center justify-center rounded-r-[2px]" style={{ backgroundColor: ACCENT }}>
            <span className="h-1.5 w-px bg-black/60" />
          </span>
        ) : null}
      </span>
      <span className="absolute inset-y-0 right-0 z-20 flex w-2.5 cursor-ew-resize items-center justify-end" onPointerDown={onTrimEnd}>
        {selected ? (
          <span className="flex h-3 w-1 items-center justify-center rounded-l-[2px]" style={{ backgroundColor: ACCENT }}>
            <span className="h-1.5 w-px bg-black/60" />
          </span>
        ) : null}
      </span>
    </div>
  );
}

// ── inspector (selected clip) ───────────────────────────────
function Inspector({
  clip,
  doc,
  startGesture,
  preview,
  endGesture,
  onClose,
}: {
  clip: Clip;
  doc: VideoEditorDoc;
  startGesture: () => void;
  preview: (d: VideoEditorDoc) => void;
  endGesture: (changed?: boolean) => void;
  onClose: () => void;
}) {
  const media = clip.kind === "video" || clip.kind === "audio";
  const visual = clip.kind !== "audio";
  const g = { onPointerDown: startGesture, onFocus: startGesture, onBlur: () => endGesture(true), onPointerUp: () => endGesture(true) };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-medium capitalize">{clip.kind}</span>
        <button type="button" onClick={onClose} title="Close" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-3 p-4">
        {clip.kind === "text" ? (
          <textarea
            value={clip.text?.content ?? ""}
            {...g}
            onChange={(e) => preview(updateClip(doc, clip.id, { text: { ...(clip.text ?? {}), content: e.target.value } }))}
            className="w-full resize-none rounded-md border border-border bg-transparent p-2 text-sm outline-none focus:border-[#14b8a6]"
            rows={3}
          />
        ) : null}

        <Section title="Timing">
          <Row label="Start">
            <Num value={clip.start} min={0} step={0.1} g={g} onInput={(v) => preview(moveClip(doc, clip.id, Math.max(0, v)))} suffix="s" />
          </Row>
          <Row label="Duration">
            <Num value={clip.duration} min={0.1} step={0.1} g={g} onInput={(v) => preview(changeDuration(doc, clip.id, Math.max(0.1, v)))} suffix="s" />
          </Row>
          {media ? (
            <Row label="Speed">
              <Num
                value={clip.speed}
                min={0.25}
                step={0.05}
                g={g}
                onInput={(v) => {
                  const speed = Math.max(0.25, v);
                  preview(updateClip(doc, clip.id, { speed, duration: (clip.out - clip.in) / speed }));
                }}
                suffix="×"
              />
            </Row>
          ) : null}
        </Section>

        {visual ? (
          <Section title="Transform">
            <Row label="X">
              <Num value={clip.transform.x} step={2} g={g} onInput={(v) => preview(updateTransform(doc, clip.id, { x: v }))} suffix="px" />
            </Row>
            <Row label="Y">
              <Num value={clip.transform.y} step={2} g={g} onInput={(v) => preview(updateTransform(doc, clip.id, { y: v }))} suffix="px" />
            </Row>
            <Row label="Scale">
              <Slide value={clip.transform.scale} min={0.1} max={3} step={0.01} g={g} onInput={(v) => preview(updateTransform(doc, clip.id, { scale: v }))} />
            </Row>
            <Row label="Opacity">
              <Slide value={clip.transform.opacity} min={0} max={1} step={0.01} g={g} onInput={(v) => preview(updateTransform(doc, clip.id, { opacity: v }))} />
            </Row>
          </Section>
        ) : null}

        {media ? (
          <Section title="Audio">
            <Row label="Volume">
              <Slide value={clip.volume} min={0} max={1} step={0.01} g={g} onInput={(v) => preview(updateClip(doc, clip.id, { volume: v }))} />
            </Row>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

type GestureProps = { onPointerDown: () => void; onFocus: () => void; onBlur: () => void; onPointerUp: () => void };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[56px_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Num({ value, min, step, suffix, g, onInput }: { value: number; min?: number; step?: number; suffix?: string; g: GestureProps; onInput: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={Number(value.toFixed(2))}
        min={min}
        step={step}
        onFocus={g.onFocus}
        onBlur={g.onBlur}
        onChange={(e) => onInput(Number(e.target.value))}
        className="w-full rounded border border-border bg-transparent px-1.5 py-1 text-xs tabular-nums outline-none focus:border-[#14b8a6]"
      />
      {suffix ? <span className="text-[11px] text-muted-foreground">{suffix}</span> : null}
    </div>
  );
}

function Slide({ value, min, max, step, g, onInput }: { value: number; min: number; max: number; step: number; g: GestureProps; onInput: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onPointerDown={g.onPointerDown}
        onPointerUp={g.onPointerUp}
        onChange={(e) => onInput(Number(e.target.value))}
        className="h-1 w-full accent-[#14b8a6]"
      />
      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{value.toFixed(2)}</span>
    </div>
  );
}

// ── small shared bits ───────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Type; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pb-2 text-[13px] transition-colors",
        active ? "border-[#14b8a6] font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}

function IconBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-4 w-px bg-muted" />;
}

// ── helpers ─────────────────────────────────────────────────
function snapPoints(doc: VideoEditorDoc, excludeId: string): number[] {
  const pts = [0];
  for (const t of doc.tracks) for (const c of t.clips) if (c.id !== excludeId) pts.push(c.start, c.start + c.duration);
  return pts;
}
function snap(t: number, pts: number[], pxPerSec: number, thresholdPx = 7): number {
  const thr = thresholdPx / pxPerSec;
  let best = t;
  let bd = thr;
  for (const p of pts) {
    const d = Math.abs(p - t);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}
function tc(s: number, fps: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const t = Math.floor(s);
  const f = Math.floor((s - t) * (fps || 30));
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}:${p(f)}`;
}
