"use client";

import type React from "react";
import { cn } from "@/lib/cn";
import type { Clip, Track, VideoEditorDoc } from "../../types";
import { ClipContextMenu } from "./clip-context-menu";
import { EmptyDropzone } from "./empty-dropzone";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineToolbar } from "./timeline-toolbar";
import { TimelineTrack } from "./timeline-track";

const HEADER_W = 120;
const RULER_H = 26;
const TRACK_H = 44;
const ACCENT = "#14b8a6";
const CARD = "rounded-xl border border-border bg-card shadow-sm";

export function Timeline({
  doc,
  selection,
  playhead,
  playing,
  pxPerSec,
  laneW,
  tickCount,
  total,
  viewportW,
  drag,
  ghost,
  guide,
  clipMenu,
  laneRef,
  scrollCb,
  urlOf,
  toggleTrack,
  onRemoveTrack,
  onSelectClip,
  onBeginClipDrag,
  onClipContext,
  setClipMenu,
  onSplitSelected,
  onTogglePlay,
  setPlayhead,
  setPxPerSec,
  dropAsset,
  setSelection,
  setDrag,
  commit,
  duplicateClip,
  splitClip,
  removeClips,
  importInputRef,
}: {
  doc: VideoEditorDoc;
  selection: Set<string>;
  playhead: number;
  playing: boolean;
  pxPerSec: number;
  laneW: number;
  tickCount: number;
  total: number;
  viewportW: number;
  drag: import("../../stores/use-editor-store").DragState;
  ghost: { trackId: string; start: number; duration: number } | null;
  guide: number | null;
  clipMenu: { x: number; y: number; id: string } | null;
  laneRef: React.RefObject<HTMLButtonElement | null>;
  scrollCb: (el: HTMLDivElement | null) => void;
  urlOf: (id?: string) => string | undefined;
  toggleTrack: (track: Track, patch: Partial<Track>) => void;
  onRemoveTrack: (trackId: string) => void;
  onSelectClip: (id: string) => void;
  onBeginClipDrag: (e: React.PointerEvent, clip: Clip, mode: "move" | "trim-start" | "trim-end") => void;
  onClipContext: (e: React.MouseEvent, clipId: string) => void;
  setClipMenu: (menu: { x: number; y: number; id: string } | null) => void;
  onSplitSelected: () => void;
  onTogglePlay: () => void;
  setPlayhead: (t: number) => void;
  setPxPerSec: (px: number | ((prev: number) => number)) => void;
  dropAsset: (assetId: string, clientX: number, trackId: string | null) => void;
  setSelection: (s: Set<string>) => void;
  setDrag: (d: import("../../stores/use-editor-store").DragState) => void;
  commit: (d: VideoEditorDoc) => void;
  duplicateClip: (doc: VideoEditorDoc, id: string) => VideoEditorDoc;
  splitClip: (doc: VideoEditorDoc, id: string, atSec: number) => VideoEditorDoc;
  removeClips: (doc: VideoEditorDoc, ids: Set<string>) => VideoEditorDoc;
  importInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const isTimelineEmpty = doc.tracks.every((t) => t.clips.length === 0);

  const xToTime = (clientX: number) => {
    if (!laneRef.current) return 0;
    const r = laneRef.current.getBoundingClientRect();
    return Math.max(0, (clientX - r.left) / pxPerSec);
  };

  return (
    <div className={cn(CARD, "flex shrink-0 flex-col transition-all duration-200", isTimelineEmpty ? "h-auto" : "h-56")}>
      <TimelineToolbar
        hasSelection={selection.size > 0}
        playing={playing}
        playhead={playhead}
        duration={doc.duration}
        pxPerSec={pxPerSec}
        onSplit={onSplitSelected}
        onJumpStart={() => setPlayhead(0)}
        onTogglePlay={onTogglePlay}
        onJumpEnd={() => setPlayhead(total)}
        onZoomOut={() => setPxPerSec((p) => Math.max(12, p / 1.4))}
        onZoomIn={() => setPxPerSec((p) => Math.min(200, p * 1.4))}
        onZoomChange={setPxPerSec}
        onFit={() => setPxPerSec(Math.max(12, Math.min(200, (viewportW - HEADER_W) / Math.max(1, total))))}
      />

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
          <TimelineRuler
            laneW={laneW}
            pxPerSec={pxPerSec}
            tickCount={tickCount}
            laneRef={laneRef}
            onRulerPointerDown={(e) => {
              e.stopPropagation();
              setPlayhead(Math.min(total, xToTime(e.clientX)));
              setDrag({ kind: "playhead" });
            }}
          />

          {isTimelineEmpty ? (
            <EmptyDropzone onImport={() => importInputRef.current?.click()} />
          ) : (
            doc.tracks.map((track) => (
              <TimelineTrack
                key={track.id}
                track={track}
                doc={doc}
                laneW={laneW}
                pxPerSec={pxPerSec}
                selection={selection}
                drag={drag}
                urlOf={urlOf}
                toggleTrack={toggleTrack}
                onRemoveTrack={onRemoveTrack}
                onSelectClip={onSelectClip}
                onBeginClipDrag={onBeginClipDrag}
                onClipContext={onClipContext}
                onLaneClick={(e) => {
                  setSelection(new Set());
                  setPlayhead(Math.min(total, xToTime(e.clientX)));
                  setDrag({ kind: "playhead" });
                }}
              />
            ))
          )}

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

      {clipMenu ? (
        <ClipContextMenu
          x={clipMenu.x}
          y={clipMenu.y}
          onClose={() => setClipMenu(null)}
          onDuplicate={() => {
            commit(duplicateClip(doc, clipMenu.id));
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
    </div>
  );
}
