"use client";

import {
  ArrowLeft,
  Check,
  Cloud,
  Download,
  Film,
  Loader2,
  Redo2,
  Settings,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { EditorModeTabs } from "@/shared/components/editor-mode-tabs";
import { uploadToProject } from "../api";
import { Inspector } from "../components/inspector";
import { CATEGORIES, LeftPanel, RailBtn } from "../components/left-panel/left-panel";
import { AspectMenu, Preview } from "../components/preview";
import { Timeline } from "../components/timeline/timeline";
import { ExportPanel } from "../export-panel";
import { useEditor } from "../hooks/use-editor";
import {
  addClip,
  addTrack,
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
  updateTrack,
} from "../lib/doc-ops";
import { docDuration } from "../lib/timeline-engine";
import type { CategoryId, Clip, Track, VideoEditorDoc } from "../types";

const ACCENT = "#14b8a6";
const HEADER_W = 120;
const RULER_H = 26;
const TRACK_H = 44;
const CARD = "rounded-xl border border-border bg-card shadow-sm";

export function VideoEditorPage({ projectId }: { projectId: string }) {
  const {
    project,
    assets,
    doc,
    setTitle,
    saveState,
    commit,
    startGesture,
    preview,
    endGesture,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditor(projectId);

  const [leftCat, setLeftCat] = useState<CategoryId>("ai-tools");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(48);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clipMenu, setClipMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const importInput = useRef<HTMLInputElement>(null);
  const laneRef = useRef<HTMLButtonElement>(null);
  const scrollEl = useRef<HTMLDivElement | null>(null);
  const scrollCb = useCallback((el: HTMLDivElement | null) => {
    scrollEl.current = el;
  }, []);

  const [viewportW, setViewportW] = useState(1200);
  useEffect(() => {
    const update = () => setViewportW(scrollEl.current?.clientWidth ?? window.innerWidth - 340);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const total = useMemo(() => (doc ? Math.max(10, docDuration(doc)) : 10), [doc]);
  const laneW = useMemo(() => Math.max(viewportW - HEADER_W, Math.ceil(total * pxPerSec) + 300), [viewportW, total, pxPerSec]);
  const tickCount = useMemo(() => Math.ceil(laneW / pxPerSec) + 1, [laneW, pxPerSec]);

  // Active playing interval
  const totalRef = useRef(total);
  totalRef.current = total;
  useEffect(() => {
    if (!playing) return;
    let raf: number;
    let prev = performance.now();
    const tick = (now: number) => {
      const delta = (now - prev) / 1000;
      prev = now;
      setPlayhead((p) => {
        const next = p + delta;
        if (next >= totalRef.current) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Selected clip object helper
  const selectedClipId = selection.size === 1 ? Array.from(selection)[0] : null;
  const selectedClip = useMemo(() => {
    if (!doc || !selectedClipId) return null;
    return findClip(doc, selectedClipId)?.clip ?? null;
  }, [doc, selectedClipId]);

  // ── Drag & Drop Timeline State ───────────────────────────
  const [drag, setDrag] = useState<{
    kind: "playhead" | "move" | "trim-start" | "trim-end";
    clipId?: string;
    startSec?: number;
    startPx?: number;
    startIn?: number;
    startDur?: number;
    trackId?: string;
    grab?: { dx: number; dy: number; w: number; h: number };
  } | null>(null);

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const snapPoints = useMemo(() => {
    if (!doc) return [0];
    const pts = [0];
    for (const t of doc.tracks) for (const c of t.clips) if (c.id !== drag?.clipId) pts.push(c.start, c.start + c.duration);
    return pts;
  }, [doc, drag?.clipId]);

  const snap = useCallback(
    (t: number, thresholdPx = 7) => {
      const thr = thresholdPx / pxPerSec;
      let best = t;
      let bd = thr;
      for (const p of snapPoints) {
        const d = Math.abs(p - t);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      return best;
    },
    [snapPoints, pxPerSec],
  );

  const xToTime = useCallback(
    (clientX: number) => {
      if (!laneRef.current) return 0;
      const r = laneRef.current.getBoundingClientRect();
      return Math.max(0, (clientX - r.left) / pxPerSec);
    },
    [pxPerSec],
  );

  // Global mousemove/mouseup listener for timeline gestures
  const dragRef = useRef(drag);
  dragRef.current = drag;
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      if (!doc || !dragRef.current) return;
      const cur = dragRef.current;
      setDragPos({ x: e.clientX, y: e.clientY });

      if (cur.kind === "playhead") {
        setPlayhead(Math.min(total, xToTime(e.clientX)));
        return;
      }
      if (!cur.clipId) return;

      if (cur.kind === "move") {
        const t = snap(xToTime(e.clientX - (cur.grab?.dx ?? 0)));
        const targetRow = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-track-id]");
        const targetTrackId = targetRow?.getAttribute("data-track-id") ?? cur.trackId;
        preview(insertMove(doc, cur.clipId, t, targetTrackId ?? undefined));
      } else if (cur.kind === "trim-start") {
        const delta = xToTime(e.clientX) - (cur.startPx ?? 0);
        preview(trimClip(doc, cur.clipId, "start", delta));
      } else if (cur.kind === "trim-end") {
        const delta = xToTime(e.clientX) - (cur.startPx ?? 0);
        preview(trimClip(doc, cur.clipId, "end", delta));
      }
    };

    const onUp = () => {
      if (dragRef.current && dragRef.current.kind !== "playhead") endGesture(true);
      setDrag(null);
      setDragPos(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, doc, total, xToTime, snap, preview, endGesture]);

  // Asset URL lookup helper
  const urlOf = useCallback((id?: string) => assets.find((a) => a.id === id)?.url, [assets]);

  // Actions
  const togglePlay = () => setPlaying((p) => !p);
  const setAspect = (w: number, h: number) => doc && commit({ ...doc, width: w, height: h });
  const toggleTrack = (track: Track, patch: Partial<Track>) => doc && commit(updateTrack(doc, track.id, patch));

  const splitSelected = () => {
    if (!doc || !selectedClipId) return;
    const next = splitClip(doc, selectedClipId, playhead);
    if (next !== doc) commit(next);
  };

  const addTextClip = (content: string) => {
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

  const doImport = async (file?: File) => {
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

  const dropAsset = (assetId: string, clientX: number, rowTrackId: string | null) => {
    if (!doc) return;
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const dropTime = Math.max(0, xToTime(clientX));
    const targetKind = trackKindForClip(asset.kind);
    let track = rowTrackId ? doc.tracks.find((t) => t.id === rowTrackId) : doc.tracks.find((t) => t.kind === targetKind);
    let nextDoc = doc;
    if (!track) {
      nextDoc = addTrack(doc, targetKind);
      track = nextDoc.tracks.find((t) => t.kind === targetKind)!;
    }
    const clip = clipForAsset(asset, dropTime);
    commit(addClip(nextDoc, track.id, clip));
    setSelection(new Set([clip.id]));
  };

  const beginClipDrag = (e: React.PointerEvent, clip: Clip, mode: "move" | "trim-start" | "trim-end") => {
    e.stopPropagation();
    setSelection(new Set([clip.id]));
    startGesture();

    if (mode === "move") {
      const clipEl = e.currentTarget.closest<HTMLElement>("[title]") ?? (e.currentTarget as HTMLElement);
      const rect = clipEl.getBoundingClientRect();
      setDrag({
        kind: "move",
        clipId: clip.id,
        trackId: findClip(doc!, clip.id)?.track.id,
        grab: { dx: e.clientX - rect.left, dy: e.clientY - rect.top, w: rect.width, h: rect.height },
      });
      setDragPos({ x: e.clientX, y: e.clientY });
    } else {
      setDrag({
        kind: mode,
        clipId: clip.id,
        startSec: mode === "trim-start" ? clip.start : clip.start + clip.duration,
        startPx: e.clientX,
        startIn: clip.in,
        startDur: clip.duration,
      });
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        splitSelected();
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
  }, [selection, doc, commit, undo, redo]);

  if (!project || !doc) {
    return (
      <div className="grid h-[calc(100vh-4rem)] place-items-center bg-background text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  const showLeftPanel = !railCollapsed || !!selectedClip;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-background text-foreground select-none">
      {/* ── top bar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Exit
          </a>
          <span className="h-4 w-px bg-border" />
          <input
            type="text"
            value={project.title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded px-2 py-1 text-sm font-semibold bg-transparent outline-none hover:bg-accent focus:bg-accent"
          />
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {saveState === "saving" ? (
              <>
                <Cloud className="size-3 animate-pulse text-[#14b8a6]" /> Saving…
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="size-3 text-[#14b8a6]" /> Saved
              </>
            ) : null}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-secondary/50 p-0.5">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="grid size-7 place-items-center rounded hover:bg-accent disabled:opacity-30"
              title="Undo (Cmd+Z)"
            >
              <Undo2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="grid size-7 place-items-center rounded hover:bg-accent disabled:opacity-30"
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo2 className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setExporting(true)}
            className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <Download className="size-3.5" /> Export & Publish
          </button>
        </div>
      </header>

      {/* ── main editor layout ── */}
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        {/* left sidebar: rail navigation + category panel */}
        <aside className={cn(CARD, "flex min-h-0 shrink-0 overflow-hidden transition-[width] duration-200", showLeftPanel ? "w-80" : "w-16")}>
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
          {/* tool rail — icon-only */}
          <nav className="flex w-16 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-2 [scrollbar-width:none]">
            {CATEGORIES.map((c) => (
              <RailBtn
                key={c.id}
                active={leftCat === c.id && !railCollapsed && !selectedClip}
                onClick={() => {
                  if (selectedClip) {
                    setSelection(new Set());
                    setLeftCat(c.id);
                    setRailCollapsed(false);
                  } else if (leftCat === c.id) {
                    setRailCollapsed((v) => !v);
                  } else {
                    setLeftCat(c.id);
                    setRailCollapsed(false);
                  }
                }}
                icon={c.icon}
                label={c.label}
              />
            ))}
          </nav>
          {/* content — clip inspector when something's selected, else category panel */}
          {showLeftPanel ? (
            selectedClip ? (
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
              <LeftPanel
                category={leftCat}
                setCategory={setLeftCat}
                assets={assets}
                onImport={() => importInput.current?.click()}
                importing={importing}
                onAddText={addTextClip}
                projectId={projectId}
                selectedClip={selectedClip}
              />
            )
          ) : null}
        </aside>

        {/* preview + inspector stacked over timeline */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-h-0 flex-1 gap-2">
            {/* center preview */}
            <main className={cn(CARD, "flex min-w-0 flex-1 flex-col gap-3 p-4")}>
              <Preview doc={doc} urlOf={urlOf} playhead={playhead} playing={playing} />
              <div className="flex shrink-0 items-center justify-center">
                <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-1">
                  <AspectMenu doc={doc} setAspect={setAspect} />
                  <span className="mx-0.5 h-5 w-px bg-border" />
                  <button type="button" className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-accent">
                    <span className="size-4 rounded-full border border-border bg-foreground" />
                    Background
                  </button>
                  <button type="button" className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Settings className="size-4" />
                    Settings
                  </button>
                </div>
              </div>
            </main>
          </div>

          {/* ── timeline ── */}
          <Timeline
            doc={doc}
            selection={selection}
            playhead={playhead}
            playing={playing}
            pxPerSec={pxPerSec}
            laneW={laneW}
            tickCount={tickCount}
            total={total}
            viewportW={viewportW}
            drag={drag}
            ghost={
              drag?.kind === "move" && drag.clipId
                ? (() => {
                    const f = findClip(doc, drag.clipId);
                    if (!f) return null;
                    const t = snap(xToTime((dragPos?.x ?? 0) - (drag.grab?.dx ?? 0)));
                    const targetRow = document.elementFromPoint(dragPos?.x ?? 0, dragPos?.y ?? 0)?.closest("[data-track-id]");
                    const targetTrackId = targetRow?.getAttribute("data-track-id") ?? f.track.id;
                    return { trackId: targetTrackId, start: t, duration: f.clip.duration };
                  })()
                : null
            }
            guide={drag?.kind === "move" || drag?.kind === "trim-start" || drag?.kind === "trim-end" ? snap(xToTime(dragPos?.x ?? 0)) : null}
            clipMenu={clipMenu}
            laneRef={laneRef}
            scrollCb={scrollCb}
            urlOf={urlOf}
            toggleTrack={toggleTrack}
            onRemoveTrack={(trackId) => commit(removeTrack(doc, trackId))}
            onSelectClip={(id) => setSelection(new Set([id]))}
            onBeginClipDrag={beginClipDrag}
            onClipContext={(e, id) => {
              e.preventDefault();
              setSelection(new Set([id]));
              setClipMenu({ x: e.clientX, y: e.clientY, id });
            }}
            setClipMenu={setClipMenu}
            onSplitSelected={splitSelected}
            onTogglePlay={togglePlay}
            setPlayhead={setPlayhead}
            setPxPerSec={setPxPerSec}
            dropAsset={dropAsset}
            setSelection={setSelection}
            setDrag={setDrag}
            commit={commit}
            duplicateClip={duplicateClip}
            splitClip={splitClip}
            removeClips={removeClips}
            importInputRef={importInput}
          />
        </div>

        {/* mode tabs: floating, full-width */}
        <EditorModeTabs projectId={projectId} mode="video" className="shrink-0 overflow-hidden rounded-lg border border-border" />
      </div>

      {/* ── export modal ── */}
      {exporting ? (
        <ExportPanel
          projectId={project.id}
          title={project.title}
          doc={doc}
          share={project.share ?? { review: null, presentation: null }}
          saveFirst={async () => {}}
          onClose={() => setExporting(false)}
        />
      ) : null}

      {/* dragged floating clip ghost */}
      {drag?.kind === "move" && drag.grab && dragPos
        ? (() => {
            const f = findClip(doc, drag.clipId!);
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
    </div>
  );
}
