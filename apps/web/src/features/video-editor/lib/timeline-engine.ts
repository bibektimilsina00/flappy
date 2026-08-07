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
 */
import type { Clip, Track, VideoEditorDoc } from "../types";

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
  clipIds: Iterable<string>,
  scope: RippleScope = "track",
  linked: "delete" | "detach" | "leave" = "delete",
): VideoEditorDoc {
  const fps = fpsOf(doc);
  const targets = new Set(clipIds);
  if (targets.size === 0) return doc;

  // collect linked children if requested
  if (linked === "delete") {
    for (const id of Array.from(targets)) {
      const loc = locate(doc, id);
      if (loc?.clip.linkedClipIds) for (const cid of loc.clip.linkedClipIds) targets.add(cid);
    }
  }

  let next = doc;
  const emptied = new Set<string>(); // tracks that lost their last clip → remove them
  for (const track of doc.tracks) {
    const remaining = track.clips.filter((c) => !targets.has(c.id));
    if (remaining.length === track.clips.length) continue;
    if (remaining.length === 0) emptied.add(track.id);
    if (isMagnetic(track) && scope !== "off") {
      next = putClips(next, track.id, reflow(sortByStart(remaining), fps));
    } else {
      next = putClips(next, track.id, sortByStart(remaining));
    }
  }

  if (linked === "detach") {
    next = {
      ...next,
      tracks: next.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.parentClipId && targets.has(c.parentClipId) ? { ...c, parentClipId: undefined } : c)),
      })),
    };
  }

  // Drop now-empty tracks (a track deleted down to its last clip goes away too).
  if (emptied.size) next = { ...next, tracks: next.tracks.filter((t) => !emptied.has(t.id)) };

  return commitDoc(doc, next);
}

/** Trim clip in/out/start/duration. Magnetic: ripples adjacent clips (Rule 5). */
export function trimClip(
  doc: VideoEditorDoc,
  clipId: string,
  edge: "start" | "end",
  deltaSec: number,
  scope: RippleScope = "track",
): VideoEditorDoc {
  const fps = fpsOf(doc);
  const loc = locate(doc, clipId);
  if (!loc) return doc;
  const { clip, track } = loc;
  const df = toF(deltaSec, fps);
  if (df === 0) return doc;

  const minF = 1;
  const oldDurF = Math.max(minF, toF(clip.duration, fps));
  const oldStartF = toF(clip.start, fps);
  const oldInF = toF(clip.in, fps);

  let newStartF = oldStartF;
  let newDurF = oldDurF;
  let newInF = oldInF;

  if (edge === "start") {
    // dragging the left edge: clamp so duration >= 1 frame & in >= 0
    const maxRight = oldStartF + oldDurF - minF;
    const maxLeftIn = -oldInF; // can't trim left past source start (in >= 0)
    const clampedDf = Math.max(maxLeftIn, Math.min(maxRight - oldStartF, df));
    newStartF = oldStartF + clampedDf;
    newDurF = oldDurF - clampedDf;
    newInF = oldInF + clampedDf;
  } else {
    // dragging the right edge
    newDurF = Math.max(minF, oldDurF + df);
  }

  const newClip: Clip = {
    ...clip,
    start: toS(newStartF, fps),
    duration: toS(newDurF, fps),
    in: toS(newInF, fps),
    out: toS(newInF + newDurF, fps),
  };

  const durDeltaF = newDurF - oldDurF;
  const attachedIds = clip.linkedClipIds ?? [];

  let next = doc;

  if (isMagnetic(track) && scope !== "off") {
    const idx = track.clips.findIndex((c) => c.id === clipId);
    const head = track.clips.slice(0, idx);
    const tail = track.clips.slice(idx + 1);

    if (edge === "start") {
      // left edge trim shifts the trimmed clip's start, so reflow head end-to-end to close/make space
      const reflowedHead = reflow(sortByStart(head), fps);
      const startF = reflowedHead.length ? toF(reflowedHead[reflowedHead.length - 1].start, fps) + toF(reflowedHead[reflowedHead.length - 1].duration, fps) : 0;
      const placed: Clip = { ...newClip, start: toS(startF, fps) };
      const reflowedTail = reflow(sortByStart(tail), fps);
      // shift tail to sit immediately after `placed`
      const tailOffsetF = startF + newDurF;
      let cursorF = tailOffsetF;
      const shiftedTail = reflowedTail.map((c) => {
        const dur = Math.max(minF, toF(c.duration, fps));
        const sc = { ...c, start: toS(cursorF, fps) };
        cursorF += dur;
        return sc;
      });
      next = putClips(next, track.id, [...reflowedHead, placed, ...shiftedTail]);
    } else {
      // right edge trim leaves head alone; places newClip; ripples tail by `durDeltaF`
      const reflowedTail = reflow(sortByStart(tail), fps);
      let cursorF = oldStartF + newDurF;
      const shiftedTail = reflowedTail.map((c) => {
        const dur = Math.max(minF, toF(c.duration, fps));
        const sc = { ...c, start: toS(cursorF, fps) };
        cursorF += dur;
        return sc;
      });
      next = putClips(next, track.id, [...head, newClip, ...shiftedTail]);
    }
  } else {
    // free track: update in place (caller handles overlap prevention if needed)
    next = putClips(
      next,
      track.id,
      track.clips.map((c) => (c.id === clipId ? newClip : c)),
    );
  }

  // shift attached overlay clips by whatever start delta occurred
  const actualStartDeltaF = newStartF - oldStartF;
  if (actualStartDeltaF !== 0 && attachedIds.length > 0) {
    next = shiftClips(next, attachedIds, actualStartDeltaF, fps);
  }

  if (scope === "all" && durDeltaF !== 0) {
    next = rippleOtherTracks(next, track.id, oldStartF + oldDurF, durDeltaF, fps);
  }

  return commitDoc(doc, next);
}

/** Move clip inside a track or cross-track. Rule 6: move = remove + insert. */
export function moveClip(
  doc: VideoEditorDoc,
  clipId: string,
  toSec: number,
  toTrackId?: string,
  scope: RippleScope = "track",
): VideoEditorDoc {
  const loc = locate(doc, clipId);
  if (!loc) return doc;
  const targetTrackId = toTrackId ?? loc.track.id;
  // Step 1: remove clip from current position (rippling its track if magnetic)
  const afterRemove = removeClip(doc, [clipId], scope, "detach");
  // Step 2: insert into destination track at `toSec`
  return insertClip(afterRemove, targetTrackId, { ...loc.clip, start: toSec }, toSec, scope);
}

/** Split a clip at `atSec` into two clips. Mint 1 new id, preserving all properties. */
export function splitClip(doc: VideoEditorDoc, clipId: string, atSec: number): VideoEditorDoc {
  const fps = fpsOf(doc);
  const loc = locate(doc, clipId);
  if (!loc) return doc;
  const { clip, track } = loc;

  const atF = toF(atSec, fps);
  const startF = toF(clip.start, fps);
  const durF = toF(clip.duration, fps);
  const endF = startF + durF;

  // split point must land strictly inside the clip (>= 1 frame on both sides)
  if (atF <= startF + 1 || atF >= endF - 1) return doc;

  const leftDurF = atF - startF;
  const rightDurF = durF - leftDurF;
  const inF = toF(clip.in, fps);
  const speed = clip.speed || 1;

  const leftClip: Clip = {
    ...clip,
    duration: toS(leftDurF, fps),
    out: toS(inF + leftDurF * speed, fps),
  };

  const rightClip: Clip = {
    ...clip,
    id: uid(),
    start: toS(atF, fps),
    duration: toS(rightDurF, fps),
    in: toS(inF + leftDurF * speed, fps),
    out: toS(toF(clip.out, fps), fps),
  };

  const idx = track.clips.findIndex((c) => c.id === clipId);
  const newClips = [...track.clips.slice(0, idx), leftClip, rightClip, ...track.clips.slice(idx + 1)];
  return commitDoc(doc, putClips(doc, track.id, sortByStart(newClips)));
}

/** Change a clip's duration via right-edge trim. */
export function changeDuration(doc: VideoEditorDoc, clipId: string, newDurationSec: number): VideoEditorDoc {
  const loc = locate(doc, clipId);
  if (!loc) return doc;
  const deltaSec = newDurationSec - loc.clip.duration;
  return trimClip(doc, clipId, "end", deltaSec);
}

/** Duplicate a clip adjacent to the original. */
export function duplicateClip(doc: VideoEditorDoc, clipId: string): VideoEditorDoc {
  const loc = locate(doc, clipId);
  if (!loc) return doc;
  const newClip: Clip = {
    ...loc.clip,
    id: uid(),
    start: loc.clip.start + loc.clip.duration,
  };
  return insertClip(doc, loc.track.id, newClip, newClip.start);
}
