/**
 * Magnetic timeline engine — the single source of truth for every edit.
 *
 * Design rules (see the feature spec):
 *  - Pure. No DOM, no React, no mutation. Input doc → new doc.
 *  - Positions are computed in **integer frames** internally and only converted to
 *    seconds for storage/display, so repeated edits never accumulate float drift.
 *  - Magnetic tracks (the default) are always gap-free & overlap-free: insert makes
 *    space, delete closes the gap, trim ripples the rest, move = remove + insert.
 *  - Every command validates its result before returning; an invalid result is
 *    rejected (the original doc is returned unchanged) so the timeline can't corrupt.
 *  - Clip ids are stable across move/trim/ripple; only split mints one new id.
 *
 * ponytail: model stays in seconds (backend render + persistence read seconds); the
 * engine quantizes to whole frames on every write, which kills accumulation drift
 * without migrating the persisted schema. Upgrade path: store frames if we ever need
 * sub-frame anything.
 */
import type { Clip, Track, VideoEditorDoc } from "./types";

export type RippleScope = "track" | "all" | "off";

export const uid = () => `c-${crypto.randomUUID().slice(0, 8)}`;

const DEFAULT_FPS = 30;
const fpsOf = (doc: VideoEditorDoc) => (doc.fps && doc.fps > 0 ? doc.fps : DEFAULT_FPS);
const toF = (sec: number, fps: number) => Math.round(sec * fps); // seconds → frame index
const toS = (frames: number, fps: number) => frames / fps; // frames → seconds
const isMagnetic = (t: Track) => t.magnetic !== false;

const sortByStart = (clips: Clip[]) => [...clips].sort((a, b) => a.start - b.start);

export function locate(doc: VideoEditorDoc, clipId: string): { clip: Clip; track: Track } | null {
  for (const track of doc.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return { clip, track };
  }
  return null;
}

export function docDuration(doc: VideoEditorDoc): number {
  let max = 0;
  for (const t of doc.tracks) for (const c of t.clips) max = Math.max(max, c.start + c.duration);
  return max;
}

/** Snap start/duration to whole frames (>= 1 frame long, >= 0 start). */
function quantize(c: Clip, fps: number): Clip {
  return { ...c, start: toS(Math.max(0, toF(c.start, fps)), fps), duration: toS(Math.max(1, toF(c.duration, fps)), fps) };
}

/** Lay an ordered clip list end-to-end from 0 — closes gaps (including a leading one)
 * & removes overlaps in one O(n) pass. The array order IS the sequence (no re-sort).
 * Magnetic tracks always start at 0; a delay is a free/connected clip, not a gap. */
function reflow(order: Clip[], fps: number): Clip[] {
  if (order.length === 0) return order;
  let cursor = 0;
  return order.map((c) => {
    const df = Math.max(1, toF(c.duration, fps));
    const nc: Clip = { ...c, start: toS(cursor, fps), duration: toS(df, fps) };
    cursor += df;
    return nc;
  });
}

/** Nearest start >= 0 where a `dur`-long clip doesn't overlap `others` (free tracks only). */
function noOverlapStart(others: Clip[], desired: number, dur: number, fps: number): number {
  const d = Math.max(1, toF(dur, fps));
  const ranges = others
    .map((c) => [toF(c.start, fps) - d, toF(c.start, fps) + Math.max(1, toF(c.duration, fps))] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [lo, hi] of ranges) {
    const last = merged[merged.length - 1];
    if (last && lo <= last[1]) last[1] = Math.max(last[1], hi);
    else merged.push([lo, hi]);
  }
  let s = Math.max(0, toF(desired, fps));
  for (const [lo, hi] of merged) if (s > lo && s < hi) s = s - lo < hi - s ? lo : hi;
  s = Math.max(0, s);
  for (const [lo, hi] of merged) if (s > lo && s < hi) s = hi;
  return toS(s, fps);
}

// ── validation ─────────────────────────────────────────────
/** Return a list of invariant violations. Empty ⇒ the doc is a legal timeline. */
export function validate(doc: VideoEditorDoc): string[] {
  const errs: string[] = [];
  const fps = fpsOf(doc);
  const eps = 1 / (fps * 4);
  const seen = new Set<string>();
  for (const t of doc.tracks) {
    let prevStart = Number.NEGATIVE_INFINITY;
    let prevEnd = Number.NEGATIVE_INFINITY;
    for (const c of t.clips) {
      if (seen.has(c.id)) errs.push(`duplicate id ${c.id}`);
      seen.add(c.id);
      if (!Number.isFinite(c.start) || !Number.isFinite(c.duration)) errs.push(`NaN in ${c.id}`);
      if (c.start < -eps) errs.push(`negative start ${c.id}`);
      if (c.duration <= eps) errs.push(`duration <= 0 ${c.id}`);
      if (c.start < prevStart - eps) errs.push(`track ${t.id} not sorted at ${c.id}`);
      if (c.start < prevEnd - eps) errs.push(`overlap on track ${t.id} at ${c.id}`);
      prevStart = c.start;
      prevEnd = c.start + c.duration;
    }
  }
  return errs;
}

/** Recompute duration, validate, and either accept the candidate or reject it
 * (returning the original) so a buggy op can never corrupt the timeline. */
function commitDoc(orig: VideoEditorDoc, candidate: VideoEditorDoc): VideoEditorDoc {
  const next = { ...candidate, duration: docDuration(candidate) };
  const errs = validate(next);
  if (errs.length) {
    if (typeof console !== "undefined") console.warn("[timeline-engine] rejected invalid edit:", errs);
    return orig;
  }
  return next;
}

const putClips = (doc: VideoEditorDoc, trackId: string, clips: Clip[]): VideoEditorDoc => ({
  ...doc,
  tracks: doc.tracks.map((t) => (t.id === trackId ? { ...t, clips } : t)),
});

/** Shift a set of clips (linked overlays) by a frame delta, wherever they live. */
function shiftClips(doc: VideoEditorDoc, ids: Iterable<string>, deltaFrames: number, fps: number): VideoEditorDoc {
  const set = new Set(ids);
  if (deltaFrames === 0 || set.size === 0) return doc;
  return {
    ...doc,
    tracks: doc.tracks.map((t) => ({
      ...t,
      clips: sortByStart(
        t.clips.map((c) => (set.has(c.id) ? { ...c, start: toS(Math.max(0, toF(c.start, fps) + deltaFrames), fps) } : c)),
      ),
    })),
  };
}

/** All-tracks ripple: shift clips (except on `exceptTrackId`) whose start is at/after
 * `fromFrame` by `deltaFrames`. Used only when scope === "all". */
function rippleOtherTracks(
  doc: VideoEditorDoc,
  exceptTrackId: string,
  fromFrame: number,
  deltaFrames: number,
  fps: number,
): VideoEditorDoc {
  if (deltaFrames === 0) return doc;
  return {
    ...doc,
    tracks: doc.tracks.map((t) => {
      if (t.id === exceptTrackId) return t;
      return {
        ...t,
        clips: sortByStart(
          t.clips.map((c) =>
            toF(c.start, fps) >= fromFrame ? { ...c, start: toS(Math.max(0, toF(c.start, fps) + deltaFrames), fps) } : c,
          ),
        ),
      };
    }),
  };
}

// ── commands ───────────────────────────────────────────────

/** Insert a clip into a track at `atSec`. Magnetic: makes space (Rule 3). Free: drops
 * at the nearest non-overlapping slot. */
export function insertClip(
  doc: VideoEditorDoc,
  trackId: string,
  clip: Clip,
  atSec: number,
  scope: RippleScope = "track",
): VideoEditorDoc {
  const fps = fpsOf(doc);
  const track = doc.tracks.find((t) => t.id === trackId);
  if (!track) return doc;
  const inserted = quantize({ ...clip }, fps);
  let clips: Clip[];
  if (isMagnetic(track) && scope !== "off") {
    const ordered = sortByStart(track.clips);
    const t = toF(atSec, fps);
    // clips whose midpoint is at/left of the insertion point stay before it
    const idx = ordered.filter((c) => toF(c.start, fps) + Math.max(1, toF(c.duration, fps)) / 2 <= t).length;
    clips = reflow([...ordered.slice(0, idx), inserted, ...ordered.slice(idx)], fps);
  } else {
    clips = sortByStart([...track.clips, { ...inserted, start: noOverlapStart(track.clips, atSec, inserted.duration, fps) }]);
  }
  let next = putClips(doc, trackId, clips);
  if (scope === "all") next = rippleOtherTracks(next, trackId, toF(atSec, fps), Math.max(1, toF(inserted.duration, fps)), fps);
  return commitDoc(doc, next);
}

/** Delete clip(s). Magnetic tracks close the gap (Rule 4). `linked` decides the fate of
 * attached overlays/captions: delete them too, detach them, or leave them in place. */
export function removeClip(
  doc: VideoEditorDoc,
  ids: Set<string> | string,
  opts: { scope?: RippleScope; linked?: "delete" | "detach" | "keep" } = {},
): VideoEditorDoc {
  const idset = ids instanceof Set ? new Set(ids) : new Set([ids]);
  const scope = opts.scope ?? "track";
  const linked = opts.linked ?? "detach";
  const fps = fpsOf(doc);

  if (linked === "delete") {
    for (const t of doc.tracks) for (const c of t.clips) if (idset.has(c.id)) for (const lid of c.linkedClipIds ?? []) idset.add(lid);
  }
  let tracks = doc.tracks.map((t) => {
    const kept = t.clips.filter((c) => !idset.has(c.id));
    if (kept.length === t.clips.length) return t;
    const clips = isMagnetic(t) && scope !== "off" ? reflow(sortByStart(kept), fps) : sortByStart(kept);
    return { ...t, clips };
  });
  if (linked === "detach") {
    tracks = tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => {
        const parentGone = c.parentClipId && idset.has(c.parentClipId);
        const linkedIds = c.linkedClipIds?.filter((l) => !idset.has(l));
        if (!parentGone && (linkedIds?.length ?? 0) === (c.linkedClipIds?.length ?? 0)) return c;
        return { ...c, parentClipId: parentGone ? undefined : c.parentClipId, linkedClipIds: linkedIds };
      }),
    }));
  }
  return commitDoc(doc, { ...doc, tracks });
}

/** Move a clip to `atSec` (optionally onto `newTrackId`). Implemented as remove + close
 * gap + insert + ripple (Rule 6) — never a direct start assignment. Linked clips follow. */
export function moveClip(
  doc: VideoEditorDoc,
  clipId: string,
  atSec: number,
  newTrackId?: string,
  scope: RippleScope = "track",
): VideoEditorDoc {
  const found = locate(doc, clipId);
  if (!found) return doc;
  const fps = fpsOf(doc);
  const oldStartF = toF(found.clip.start, fps);
  const targetId = newTrackId ?? found.track.id;
  const clip = found.clip;

  const removed = removeClip(doc, clipId, { scope, linked: "keep" });
  const inserted = insertClip(removed, targetId, clip, atSec, scope);
  const moved = locate(inserted, clipId);
  if (!moved || !clip.linkedClipIds?.length) return inserted;
  return commitDoc(doc, shiftClips(inserted, clip.linkedClipIds, toF(moved.clip.start, fps) - oldStartF, fps));
}

/** Trim a clip's head ("start") or tail ("end") by `deltaSec`, clamped to media bounds.
 * Magnetic: the change ripples the following clips (Rule 5). Free: clamp to neighbours. */
export function trimClip(
  doc: VideoEditorDoc,
  clipId: string,
  edge: "start" | "end",
  deltaSec: number,
  scope: RippleScope = "track",
): VideoEditorDoc {
  const found = locate(doc, clipId);
  if (!found) return doc;
  const fps = fpsOf(doc);
  const c = found.clip;
  const minDur = toS(1, fps);
  const magnetic = isMagnetic(found.track) && scope !== "off";

  let next: Clip;
  if (edge === "start") {
    let d = Math.min(deltaSec, c.duration - minDur); // keep >= 1 frame
    if (c.speed > 0) d = Math.max(d, -c.in / c.speed); // don't pull source `in` below 0
    d = toS(toF(d, fps), fps); // frame-align
    // magnetic: left edge is pinned to the predecessor → only in/duration change, then reflow.
    // free: keep the right edge fixed → start moves with the head.
    next = { ...c, start: magnetic ? c.start : Math.max(0, c.start + d), duration: c.duration - d, in: Math.max(0, c.in + d * c.speed) };
  } else {
    let d = Math.max(deltaSec, minDur - c.duration);
    d = toS(toF(d, fps), fps);
    const duration = c.duration + d;
    next = { ...c, duration, out: c.in + duration * c.speed };
  }

  let clips = found.track.clips.map((x) => (x.id === clipId ? next : x));
  if (magnetic) {
    clips = reflow(sortByStart(clips), fps);
  } else {
    clips = clampFree(sortByStart(clips), clipId, fps);
  }
  let result = putClips(doc, found.track.id, clips);
  if (scope === "all") {
    const deltaF = toF(next.duration, fps) - toF(c.duration, fps);
    result = rippleOtherTracks(result, found.track.id, toF(c.start + c.duration, fps), deltaF, fps);
  }
  return commitDoc(doc, result);
}

/** Free-track neighbour clamp: shrink `clipId` so it doesn't overlap its neighbours. */
function clampFree(clips: Clip[], clipId: string, fps: number): Clip[] {
  const i = clips.findIndex((c) => c.id === clipId);
  if (i < 0) return clips;
  const c = clips[i];
  const minDur = toS(1, fps);
  let start = Math.max(0, c.start);
  let end = c.start + c.duration;
  const prev = clips[i - 1];
  const nextC = clips[i + 1];
  if (prev && start < prev.start + prev.duration) start = prev.start + prev.duration;
  if (nextC && end > nextC.start) end = nextC.start;
  const duration = Math.max(minDur, end - start);
  return clips.map((x) => (x.id === clipId ? { ...x, start, duration } : x));
}

/** Split a clip at `atSec` into two — total duration unchanged, left keeps the id. */
export function splitClip(doc: VideoEditorDoc, clipId: string, atSec: number): VideoEditorDoc {
  const found = locate(doc, clipId);
  if (!found) return doc;
  const fps = fpsOf(doc);
  const c = found.clip;
  const at = toS(toF(atSec, fps), fps);
  const minDur = toS(1, fps);
  if (at <= c.start + minDur / 2 || at >= c.start + c.duration - minDur / 2) return doc;
  const leftDur = at - c.start;
  const left: Clip = { ...c, duration: leftDur, out: c.in + leftDur * c.speed };
  const right: Clip = {
    ...c,
    id: uid(),
    start: at,
    duration: c.duration - leftDur,
    in: c.in + leftDur * c.speed,
    linkedClipIds: undefined, // the two halves don't both own the same overlays
  };
  const clips = sortByStart(found.track.clips.flatMap((x) => (x.id === clipId ? [left, right] : [x])));
  return commitDoc(doc, putClips(doc, found.track.id, clips));
}

/** Merge two adjacent clips on the same track into one (inverse of split). The left
 * clip keeps its id; the combined length is the sum, so timeline length is unchanged. */
export function mergeClips(doc: VideoEditorDoc, leftId: string, rightId: string): VideoEditorDoc {
  const l = locate(doc, leftId);
  const r = locate(doc, rightId);
  if (!l || !r || l.track.id !== r.track.id) return doc;
  const duration = l.clip.duration + r.clip.duration;
  const merged: Clip = { ...l.clip, duration, out: l.clip.in + duration * l.clip.speed };
  const clips = sortByStart(l.track.clips.filter((c) => c.id !== rightId).map((c) => (c.id === leftId ? merged : c)));
  return commitDoc(doc, putClips(doc, l.track.id, reflow(clips, fpsOf(doc))));
}

/** Set a clip's on-timeline length exactly (tail trim). */
export function changeDuration(doc: VideoEditorDoc, clipId: string, newDurSec: number, scope: RippleScope = "track"): VideoEditorDoc {
  const found = locate(doc, clipId);
  if (!found) return doc;
  return trimClip(doc, clipId, "end", newDurSec - found.clip.duration, scope);
}

/** Duplicate a clip and drop the copy right after it (ripples the rest on magnetic tracks). */
export function duplicateClip(doc: VideoEditorDoc, id: string): { doc: VideoEditorDoc; newId: string } {
  const found = locate(doc, id);
  if (!found) return { doc, newId: id };
  const copy: Clip = { ...found.clip, id: uid(), parentClipId: undefined, linkedClipIds: undefined };
  return { doc: insertClip(doc, found.track.id, copy, found.clip.start + found.clip.duration), newId: copy.id };
}

/** Attach `childId` to `parentId` so the child follows the parent on move/delete. */
export function linkClips(doc: VideoEditorDoc, parentId: string, childId: string): VideoEditorDoc {
  if (parentId === childId) return doc;
  return {
    ...doc,
    tracks: doc.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => {
        if (c.id === parentId) return { ...c, linkedClipIds: Array.from(new Set([...(c.linkedClipIds ?? []), childId])) };
        if (c.id === childId) return { ...c, parentClipId: parentId };
        return c;
      }),
    })),
  };
}
