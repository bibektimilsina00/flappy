"use client";

import { Eye, EyeOff, Lock, Trash2, Volume2, VolumeX } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/cn";
import type { Clip, Track, VideoEditorDoc } from "../../types";
import { ClipBar } from "./clip-bar";

const HEADER_W = 120;
const TRACK_H = 44;

export function TimelineTrack({
  track,
  doc,
  laneW,
  pxPerSec,
  selection,
  drag,
  urlOf,
  toggleTrack,
  onRemoveTrack,
  onSelectClip,
  onBeginClipDrag,
  onClipContext,
  onLaneClick,
}: {
  track: Track;
  doc: VideoEditorDoc;
  laneW: number;
  pxPerSec: number;
  selection: Set<string>;
  drag: { kind: string; clipId?: string } | null;
  urlOf: (id?: string) => string | undefined;
  toggleTrack: (track: Track, patch: Partial<Track>) => void;
  onRemoveTrack: (trackId: string) => void;
  onSelectClip: (id: string) => void;
  onBeginClipDrag: (e: React.PointerEvent, clip: Clip, mode: "move" | "trim-start" | "trim-end") => void;
  onClipContext: (e: React.MouseEvent, clipId: string) => void;
  onLaneClick: (e: React.PointerEvent) => void;
}) {
  return (
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
            onClick={() => onRemoveTrack(track.id)}
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
            onLaneClick(e);
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
            onBody={(e) => onBeginClipDrag(e, clip, "move")}
            onTrimStart={(e) => onBeginClipDrag(e, clip, "trim-start")}
            onTrimEnd={(e) => onBeginClipDrag(e, clip, "trim-end")}
            onContext={(e) => onClipContext(e, clip.id)}
          />
        ))}
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
