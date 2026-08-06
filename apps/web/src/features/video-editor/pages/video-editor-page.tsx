"use client";

import {
  Cloud,
  Copy,
  Download,
  History,
  Loader2,
  MoreHorizontal,
  Redo2,
  Settings,
  Undo2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { addToBrandKit, chromaKeyClip, detachClipAudio, duplicateProject, enhanceClipAudio, importUrl, magicCutClip, saveTemplate } from "../services/video-editor-api";
import { EditorModeTabs } from "@/shared/components/editor-mode-tabs";
import { ExportPanel } from "../components/export-panel/export-panel";
import { Inspector } from "../components/inspector/inspector";
import { CATEGORIES, LeftPanel, RailBtn } from "../components/left-panel/left-panel";
import { AiPlayground } from "../components/ai-playground/ai-playground";
import { AnimationsPanel } from "../components/animations-panel/animations-panel";
import { ClipToolbar } from "../components/clip-toolbar/clip-toolbar";
import { TransitionsPanel } from "../components/transitions-panel/transitions-panel";
import { VersionHistory } from "../components/version-history/version-history";
import { resolveAspect } from "../components/preview/aspect-presets";
import { AspectMenu, BackgroundMenu, Preview } from "../components/preview/preview";
import { Timeline } from "../components/timeline/timeline";
import { useTimeline } from "../hooks/use-timeline";
import { useVideoEditorPage } from "../hooks/use-video-editor-page";
import {
  duplicateClip,
  removeClips,
  removeTrack,
  splitClip,
  updateClip,
  updateTrack,
} from "../lib/doc-ops";
import type { Clip, Track } from "../types";

const ACCENT = "#14b8a6";
const CARD = "rounded-xl border border-border bg-card shadow-sm";

const PROJECT_MENU = [
  { label: "Duplicate Project", icon: Copy },
  { label: "Save as Template", icon: Download },
  { label: "Version History", icon: History },
] as const;

// Project "…" menu in the top bar.
function ProjectMenu({ onDuplicate, onVersionHistory, onSaveTemplate }: { onDuplicate: () => void; onVersionHistory: () => void; onSaveTemplate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid size-7 place-items-center rounded text-white hover:bg-white/10"
        title="Project options"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-white/10 bg-[#161824] p-1.5 shadow-2xl">
          {PROJECT_MENU.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setOpen(false);
                if (label === "Duplicate Project") onDuplicate();
                else if (label === "Version History") onVersionHistory();
                else if (label === "Save as Template") onSaveTemplate();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
    addShapeClip,
    addSubtitleClips,
    addImportedClip,
    detachAudioClip,
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

  const [aspectKey, setAspectKey] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const qc = useQueryClient();
  const router = useRouter();
  const duplicate = async () => {
    const { workflow_id } = await duplicateProject(projectId);
    router.push(`/video-editor?project=${workflow_id}`);
  };
  const saveAsTemplate = async () => {
    const name = window.prompt("Template name", project?.title || "Untitled")?.trim();
    if (name === undefined) return;
    try {
      const t = await saveTemplate(projectId, name || undefined);
      toast.success(`Saved "${t.name}" to Templates`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save template");
    }
  };
  const enhanceSelected = async (op: "denoise" | "remove_silences" | "chroma_key" | "magic_cut") => {
    if (!selectedClip || !doc) return;
    const r =
      op === "chroma_key"
        ? await chromaKeyClip(projectId, selectedClip.id)
        : op === "magic_cut"
          ? await magicCutClip(projectId, selectedClip.id)
          : await enhanceClipAudio(projectId, selectedClip.id, op);
    await qc.invalidateQueries({ queryKey: ["editor-project", projectId] });
    const dur = r.duration || selectedClip.duration;
    commit(updateClip(doc, selectedClip.id, { assetId: r.asset_id, in: 0, out: dur, duration: dur }));
  };
  const detachSelected = async () => {
    if (!selectedClip) return;
    const r = await detachClipAudio(projectId, selectedClip.id);
    await qc.invalidateQueries({ queryKey: ["editor-project", projectId] });
    detachAudioClip(selectedClip.id, r.asset_id);
  };
  const addStock = async (url: string, kind: string) => {
    const r = await importUrl(projectId, url, kind);
    await qc.invalidateQueries({ queryKey: ["editor-project", projectId] });
    addImportedClip(r.id, r.kind, playhead);
  };
  const saveToBrandKit = async () => {
    const clip = selectedClip;
    if (!clip) return;
    if (clip.assetId) await addToBrandKit({ kind: clip.kind, workflow_id: projectId, asset_id: clip.assetId });
    else if (clip.kind === "text" && clip.text?.color) await addToBrandKit({ kind: "color", color: clip.text.color });
    else return;
    qc.invalidateQueries({ queryKey: ["brand-kit"] });
  };
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [playgroundMode, setPlaygroundMode] = useState("text-to-video");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const openPlayground = (mode: string) => {
    setPlaygroundMode(mode);
    setPlaygroundOpen(true);
  };
  // which clip sub-panel the left rail shows: the full inspector, or the
  // animations / transitions pickers opened from the floating toolbar.
  const [clipView, setClipView] = useState<"inspector" | "animations" | "transitions">("inspector");
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the sub-view when a different clip is picked
  useEffect(() => setClipView("inspector"), [selectedClip?.id]);
  // Editor actions live in the global top bar (portaled), so the editor itself is taller.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setHeaderSlot(document.getElementById("app-header-slot")), []);

  // Keybindings listener setup
  useEffect(() => {
    return setupKeybindings(togglePlay, playhead);
  }, [setupKeybindings, togglePlay, playhead]);

  if (!project || !doc) {
    return (
      <div className="grid h-full place-items-center bg-background text-muted-foreground select-none">
        <Loader2 className="size-6 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  const showLeftPanel = !railCollapsed || !!selectedClip;
  // Which preset the canvas maps to — drives the trigger label + platform overlay.
  const aspect = resolveAspect(aspectKey, doc.width / doc.height);

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
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground select-none">
      {/* Editor actions portaled into the global top bar (no separate editor header). */}
      {headerSlot &&
        createPortal(
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Cloud
                className={cn(
                  "size-4 shrink-0",
                  saveState === "saving" ? "animate-pulse text-[#14b8a6]" : saveState === "saved" ? "text-[#14b8a6]" : "text-muted-foreground",
                )}
              />
              <input
                type="text"
                value={project.title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-40 min-w-0 rounded bg-transparent px-2 py-1 text-sm font-semibold text-white outline-none hover:bg-white/10 focus:bg-white/10"
              />
              <ProjectMenu onDuplicate={duplicate} onVersionHistory={() => setVersionsOpen(true)} onSaveTemplate={saveAsTemplate} />
              <span className="mx-1 h-4 w-px shrink-0 bg-white/15" />
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="grid size-7 shrink-0 place-items-center rounded text-white hover:bg-white/10 disabled:opacity-30"
                title="Undo (Cmd+Z)"
              >
                <Undo2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className="grid size-7 shrink-0 place-items-center rounded text-white hover:bg-white/10 disabled:opacity-30"
                title="Redo (Cmd+Shift+Z)"
              >
                <Redo2 className="size-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setExporting(true)}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              <Download className="size-3.5" /> Export & Publish
            </button>
          </div>,
          headerSlot,
        )}

      {/* ── main editor layout ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pb-2.5">
        <div className="flex min-h-0 flex-1 gap-2">
        {/* left sidebar: rail navigation + category panel */}
        <aside className={cn(CARD, "flex min-h-0 shrink-0 overflow-hidden transition-[width] duration-200", showLeftPanel ? "w-[30rem]" : "w-16")}>
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
              clipView === "animations" ? (
                <AnimationsPanel
                  clip={selectedClip}
                  onApply={(tab, preset) => commit(updateClip(doc, selectedClip.id, { animations: { ...selectedClip.animations, [tab]: preset } }))}
                  onBack={() => setClipView("inspector")}
                />
              ) : clipView === "transitions" ? (
                <TransitionsPanel
                  clip={selectedClip}
                  onApply={(preset) => commit(updateClip(doc, selectedClip.id, { transition: preset }))}
                  onBack={() => setClipView("inspector")}
                />
              ) : (
                <Inspector
                  key={selectedClip.id}
                  clip={selectedClip}
                  doc={doc}
                  startGesture={startGesture}
                  preview={preview}
                  endGesture={endGesture}
                  onClose={() => setSelection(new Set())}
                  onDelete={() => {
                    commit(removeClips(doc, new Set([selectedClip.id])));
                    setSelection(new Set());
                  }}
                  onAddText={() => addTextClip("Text", playhead)}
                  onEnhance={enhanceSelected}
                  assets={assets}
                  onReplace={(assetId) => commit(updateClip(doc, selectedClip.id, { assetId }))}
                  onDetachAudio={detachSelected}
                />
              )
            ) : (
              <LeftPanel
                category={leftCat}
                setCategory={setLeftCat}
                assets={assets}
                onImport={() => importInput.current?.click()}
                importing={importing}
                onAddText={(content, style) => addTextClip(content, playhead, style)}
                onAddShape={(type, color) => addShapeClip({ type, color }, playhead)}
                onAddSubtitles={addSubtitleClips}
                onAddStock={addStock}
                projectId={projectId}
                selectedClip={selectedClip}
                onOpenPlayground={openPlayground}
              />
            )
          ) : null}
        </aside>

        {/* preview + inspector stacked over timeline */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-h-0 flex-1 gap-2">
            {/* center preview */}
            <main className={cn(CARD, "flex min-w-0 flex-1 flex-col gap-2 p-2")}>
              <Preview
                doc={doc}
                urlOf={urlOf}
                playhead={playhead}
                playing={playing}
                overlay={showOverlay ? (aspect?.overlay ?? undefined) : undefined}
                selectedClip={selectedClip}
                startGesture={startGesture}
                preview={preview}
                endGesture={endGesture}
              />
              <div className="flex shrink-0 items-center justify-center">
                {selectedClip ? (
                  <ClipToolbar
                    clip={selectedClip}
                    doc={doc}
                    startGesture={startGesture}
                    preview={preview}
                    endGesture={endGesture}
                    onOpenAnimations={() => setClipView("animations")}
                    onOpenTransitions={() => setClipView("transitions")}
                    onGenerateVideo={() => openPlayground("text-to-video")}
                    onSaveToBrandKit={saveToBrandKit}
                    onDuplicate={() => commit(duplicateClip(doc, selectedClip.id))}
                    onDelete={() => {
                      commit(removeClips(doc, new Set([selectedClip.id])));
                      setSelection(new Set());
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-1">
                    <AspectMenu
                      doc={doc}
                      selectedKey={aspectKey}
                      onSelect={(key, w, h) => {
                        setAspectKey(key);
                        setAspect(w, h);
                      }}
                      showOverlay={showOverlay}
                      onToggleOverlay={() => setShowOverlay((v) => !v)}
                    />
                    <span className="mx-0.5 h-5 w-px bg-border" />
                    <BackgroundMenu doc={doc} onChange={(color) => commit({ ...doc, background: color })} assets={assets} urlOf={urlOf} />
                    <button type="button" className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Settings className="size-4" />
                      Settings
                    </button>
                  </div>
                )}
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
        </div>

        {/* mode tabs: docked bottom bar below the main content */}
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

      {/* ── AI generation playground ── */}
      <AiPlayground open={playgroundOpen} onClose={() => setPlaygroundOpen(false)} initialMode={playgroundMode} projectId={projectId} />

      <VersionHistory open={versionsOpen} onClose={() => setVersionsOpen(false)} projectId={projectId} doc={doc} onRestore={(d) => commit(d)} />

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
