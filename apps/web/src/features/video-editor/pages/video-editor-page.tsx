"use client";

import {
  ArrowLeft,
  Check,
  Cloud,
  Download,
  Loader2,
  Redo2,
  Settings,
  Undo2,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { EditorModeTabs } from "@/shared/components/editor-mode-tabs";
import { ExportPanel } from "../components/export-panel/export-panel";
import { Inspector } from "../components/inspector/inspector";
import { CATEGORIES, LeftPanel, RailBtn } from "../components/left-panel/left-panel";
import { AspectMenu, Preview } from "../components/preview/preview";
import { Timeline } from "../components/timeline/timeline";
import { useTimeline } from "../hooks/use-timeline";
import { useVideoEditorPage } from "../hooks/use-video-editor-page";
import {
  duplicateClip,
  removeClips,
  removeTrack,
  splitClip,
  updateTrack,
} from "../lib/doc-ops";
import type { Clip, Track } from "../types";

const ACCENT = "#14b8a6";
const CARD = "rounded-xl border border-border bg-card shadow-sm";

export function VideoEditorPage({ projectId }: { projectId: string }) {
  const page = useVideoEditorPage(projectId);
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
  } = page;

  const timeline = useTimeline(doc, startGesture, preview, endGesture);
  const {
    playhead,
    setPlayhead,
    playing,
    togglePlay,
    pxPerSec,
    setPxPerSec,
    viewportW,
    laneW,
    tickCount,
    total,
    drag,
    setDrag,
    dragPos,
    setDragPos,
    clipMenu,
    setClipMenu,
    laneRef,
    scrollCb,
    xToTime,
    snap,
  } = timeline;

  // Keybindings listener setup
  useEffect(() => {
    return setupKeybindings(togglePlay, playhead);
  }, [setupKeybindings, togglePlay, playhead]);

  if (!project || !doc) {
    return (
      <div className="grid h-[calc(100vh-4rem)] place-items-center bg-background text-muted-foreground select-none">
        <Loader2 className="size-6 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  const showLeftPanel = !railCollapsed || !!selectedClip;

  const handleBeginClipDrag = (e: React.PointerEvent, clip: Clip, mode: "move" | "trim-start" | "trim-end") => {
    e.stopPropagation();
    setSelection(new Set([clip.id]));
    startGesture();

    if (mode === "move") {
      const clipEl = e.currentTarget.closest<HTMLElement>("[title]") ?? (e.currentTarget as HTMLElement);
      const rect = clipEl.getBoundingClientRect();
      setDrag({
        kind: "move",
        clipId: clip.id,
        trackId: doc.tracks.find((t) => t.clips.some((c) => c.id === clip.id))?.id,
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
              void doImport(e.target.files?.[0], playhead);
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
                onAddText={(content) => addTextClip(content, playhead)}
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
                    const track = doc.tracks.find((t) => t.clips.some((c) => c.id === drag.clipId));
                    const clip = track?.clips.find((c) => c.id === drag.clipId);
                    if (!clip) return null;
                    const t = snap(xToTime((dragPos?.x ?? 0) - (drag.grab?.dx ?? 0)));
                    const targetRow = document.elementFromPoint(dragPos?.x ?? 0, dragPos?.y ?? 0)?.closest("[data-track-id]");
                    const targetTrackId = targetRow?.getAttribute("data-track-id") ?? track?.id;
                    return { trackId: targetTrackId ?? "", start: t, duration: clip.duration };
                  })()
                : null
            }
            guide={drag?.kind === "move" || drag?.kind === "trim-start" || drag?.kind === "trim-end" ? snap(xToTime(dragPos?.x ?? 0)) : null}
            clipMenu={clipMenu}
            laneRef={laneRef}
            scrollCb={scrollCb}
            urlOf={urlOf}
            toggleTrack={(t, p) => commit(updateTrack(doc, t.id, p))}
            onRemoveTrack={(trackId) => commit(removeTrack(doc, trackId))}
            onSelectClip={(id) => setSelection(new Set([id]))}
            onBeginClipDrag={handleBeginClipDrag}
            onClipContext={(e, id) => {
              e.preventDefault();
              setSelection(new Set([id]));
              setClipMenu({ x: e.clientX, y: e.clientY, id });
            }}
            setClipMenu={setClipMenu}
            onSplitSelected={() => splitSelected(playhead)}
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
            const track = doc.tracks.find((t) => t.clips.some((c) => c.id === drag.clipId));
            const clip = track?.clips.find((c) => c.id === drag.clipId);
            if (!clip) return null;
            const url = urlOf(clip.assetId);
            const k = clip.kind;
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
                  <span className="absolute inset-0 flex items-center truncate px-2 text-xs text-white">{clip.text?.content ?? k}</span>
                )}
              </div>
            );
          })()
        : null}
    </div>
  );
}
