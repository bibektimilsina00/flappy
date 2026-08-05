import { insertClip, moveClip, removeClip } from "./timeline-engine";
import type { Clip, VideoEditorAsset, VideoEditorDoc, Track } from "../types";

// Every position-mutating edit routes through the magnetic timeline engine (the single
// source of truth). This module only adds non-positional helpers (tracks, asset clips)
// and thin adapters that keep the page's existing call sites working.
export { changeDuration, duplicateClip, insertClip, locate as findClip, moveClip, splitClip, trimClip, uid } from "./timeline-engine";

/** Delete clip(s) — magnetic tracks close the gap. */
export const removeClips = (doc: VideoEditorDoc, ids: Set<string>): VideoEditorDoc => removeClip(doc, ids);

/** Drag a clip to a new time/track — remove + close gap + insert + ripple. */
export const insertMove = (doc: VideoEditorDoc, clipId: string, atSec: number, newTrackId?: string): VideoEditorDoc =>
  moveClip(doc, clipId, atSec, newTrackId);

/** Add a clip to a track at its own `start` (ripple-inserts on magnetic tracks). */
export const addClip = (doc: VideoEditorDoc, trackId: string, clip: Clip): VideoEditorDoc =>
  insertClip(doc, trackId, clip, clip.start);

const localUid = () => `c-${crypto.randomUUID().slice(0, 8)}`;

function mapClip(doc: VideoEditorDoc, clipId: string, fn: (c: Clip) => Clip): VideoEditorDoc {
  return {
    ...doc,
    tracks: doc.tracks.map((t) => ({ ...t, clips: t.clips.map((c) => (c.id === clipId ? fn(c) : c)) })),
  };
}

export function updateClip(doc: VideoEditorDoc, id: string, patch: Partial<Clip>): VideoEditorDoc {
  return mapClip(doc, id, (c) => ({ ...c, ...patch }));
}

export function updateTransform(doc: VideoEditorDoc, id: string, patch: Partial<Clip["transform"]>): VideoEditorDoc {
  return mapClip(doc, id, (c) => ({ ...c, transform: { ...c.transform, ...patch } }));
}

export function updateTrack(doc: VideoEditorDoc, trackId: string, patch: Partial<Track>): VideoEditorDoc {
  return { ...doc, tracks: doc.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)) };
}

/** Remove a track (and its clips). Keeps at least one track and a trailing empty. */
export function removeTrack(doc: VideoEditorDoc, trackId: string): VideoEditorDoc {
  if (doc.tracks.length <= 1) return doc;
  const tracks = doc.tracks.filter((t) => t.id !== trackId);
  if (tracks.length === 0 || tracks[tracks.length - 1].clips.length > 0) tracks.push(emptyTrack("video"));
  return { ...doc, tracks };
}

/** A fresh empty track. Names aren't shown, so a short prefix is enough. */
export function emptyTrack(kind: string): Track {
  const prefix = kind === "audio" ? "A" : kind === "text" ? "T" : "V";
  return { id: localUid(), kind, name: prefix, locked: false, hidden: false, muted: false, clips: [] };
}

/** The track kind that holds a clip of `clipKind` (image+video share visual tracks). */
export function trackKindForClip(clipKind: string): string {
  return clipKind === "audio" ? "audio" : clipKind === "text" ? "text" : "video";
}

/** Append an empty track of the given kind. */
export function addTrack(doc: VideoEditorDoc, kind: string): VideoEditorDoc {
  const prefix = kind === "video" ? "V" : kind === "audio" ? "A" : kind === "text" ? "T" : "FX";
  const n = doc.tracks.filter((t) => t.kind === kind).length + 1;
  const track: Track = { id: localUid(), kind, name: `${prefix}${n}`, locked: false, hidden: false, muted: false, clips: [] };
  // audio at the bottom, visual/text at the top — keeps the usual stacking order.
  return { ...doc, tracks: kind === "audio" ? [...doc.tracks, track] : [track, ...doc.tracks] };
}

/** First non-overlapping start ≥ `wanted` on a track (for drops that would overlap). */
export function freeStart(doc: VideoEditorDoc, trackId: string, wanted: number, duration: number): number {
  const track = doc.tracks.find((t) => t.id === trackId);
  if (!track) return Math.max(0, wanted);
  const overlaps = (s: number) => track.clips.some((c) => s < c.start + c.duration && s + duration > c.start);
  if (!overlaps(wanted)) return Math.max(0, wanted);
  return track.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
}

/** Build a clip for an asset dropped at `start`. */
export function clipForAsset(asset: VideoEditorAsset, start: number): Clip {
  const kind = asset.kind === "image" ? "image" : asset.kind === "audio" ? "audio" : "video";
  const dur = kind === "image" ? 3 : kind === "audio" ? 10 : 5;
  return {
    id: localUid(),
    assetId: asset.id,
    kind,
    start: Math.max(0, start),
    duration: dur,
    in: 0,
    out: dur,
    speed: 1,
    volume: 1,
    transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    keyframes: [],
    effects: [],
  };
}
