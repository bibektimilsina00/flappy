/**
 * Magnetic timeline engine tests. Run with Node 24's native TS + test runner:
 *   node --test src/features/video-editor/timeline-engine.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  changeDuration,
  duplicateClip,
  insertClip,
  linkClips,
  locate,
  mergeClips,
  moveClip,
  removeClip,
  splitClip,
  trimClip,
  validate,
} from "./lib/timeline-engine.ts";
import type { Clip, Track, VideoEditorDoc } from "./types.ts";

const FPS = 30;

function clip(id: string, start: number, duration: number, extra: Partial<Clip> = {}): Clip {
  return {
    id,
    kind: "video",
    start,
    duration,
    in: 0,
    out: duration,
    speed: 1,
    volume: 1,
    transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    keyframes: [],
    effects: [],
    ...extra,
  };
}
function track(id: string, clips: Clip[], magnetic = true): Track {
  return { id, kind: "video", name: id, locked: false, hidden: false, muted: false, magnetic, clips };
}
function doc(tracks: Track[], fps = FPS): VideoEditorDoc {
  return { version: 1, fps, width: 1920, height: 1080, duration: 0, background: "#000", tracks, markers: [] };
}
/** [id, start, duration] rows for a track, rounded to avoid float noise. */
function rows(d: VideoEditorDoc, tid: string): [string, number, number][] {
  const t = d.tracks.find((x) => x.id === tid);
  if (!t) throw new Error(`no track ${tid}`);
  return t.clips.map((c) => [c.id, +c.start.toFixed(4), +c.duration.toFixed(4)]);
}
const ok = (d: VideoEditorDoc) => assert.deepEqual(validate(d), [], "invariants must hold");
/** three contiguous 3s clips: A@0 B@3 C@6 */
const abc = () => doc([track("v", [clip("A", 0, 3), clip("B", 3, 3), clip("C", 6, 3)])]);

// ── insert ─────────────────────────────────────────────────
test("insert at beginning shifts everything right", () => {
  const d = insertClip(abc(), "v", clip("X", 0, 2), 0);
  ok(d);
  assert.deepEqual(rows(d, "v"), [["X", 0, 2], ["A", 2, 3], ["B", 5, 3], ["C", 8, 3]]);
});

test("insert in the middle makes space", () => {
  const d = insertClip(abc(), "v", clip("X", 0, 2), 3);
  ok(d);
  assert.deepEqual(rows(d, "v"), [["A", 0, 3], ["X", 3, 2], ["B", 5, 3], ["C", 8, 3]]);
});

test("insert at end appends", () => {
  const d = insertClip(abc(), "v", clip("X", 0, 2), 100);
  ok(d);
  assert.deepEqual(rows(d, "v"), [["A", 0, 3], ["B", 3, 3], ["C", 6, 3], ["X", 9, 2]]);
});

test("magnetic track pins to 0 (no leading gap)", () => {
  const d = insertClip(doc([track("v", [])]), "v", clip("X", 0, 2), 5);
  ok(d);
  assert.deepEqual(rows(d, "v"), [["X", 0, 2]]); // dropped at 5s but magnetic → snaps to 0
});
test("free (non-magnetic) track keeps the drop position", () => {
  const d = insertClip(doc([track("ov", [], false)]), "ov", clip("X", 0, 2), 5);
  ok(d);
  assert.deepEqual(rows(d, "ov"), [["X", 5, 2]]); // free tracks allow explicit offsets
});

// ── remove (gap closes) ────────────────────────────────────
test("delete first clip closes the gap", () => {
  const d = removeClip(abc(), "A");
  ok(d);
  assert.deepEqual(rows(d, "v"), [["B", 0, 3], ["C", 3, 3]]);
});
test("delete middle clip closes the gap", () => {
  const d = removeClip(abc(), "B");
  ok(d);
  assert.deepEqual(rows(d, "v"), [["A", 0, 3], ["C", 3, 3]]);
});
test("delete last clip", () => {
  const d = removeClip(abc(), "C");
  ok(d);
  assert.deepEqual(rows(d, "v"), [["A", 0, 3], ["B", 3, 3]]);
});

// ── trim (ripple) ──────────────────────────────────────────
test("trim longer ripples following clips right", () => {
  const d = changeDuration(abc(), "B", 6); // B 3s → 6s
  ok(d);
  assert.deepEqual(rows(d, "v"), [["A", 0, 3], ["B", 3, 6], ["C", 9, 3]]);
});
test("trim shorter ripples following clips left", () => {
  const d = changeDuration(abc(), "B", 1); // B 3s → 1s
  ok(d);
  assert.deepEqual(rows(d, "v"), [["A", 0, 3], ["B", 3, 1], ["C", 4, 3]]);
});
test("head trim changes in-point and ripples", () => {
  const d = trimClip(abc(), "B", "start", 1); // pull B head +1s
  ok(d);
  const b = locate(d, "B")!.clip;
  assert.equal(+b.duration.toFixed(4), 2);
  assert.equal(+b.in.toFixed(4), 1); // source in advanced
  assert.deepEqual(rows(d, "v"), [["A", 0, 3], ["B", 3, 2], ["C", 5, 3]]);
});
test("cannot trim a clip below one frame", () => {
  const d = changeDuration(abc(), "B", -100);
  ok(d);
  const b = locate(d, "B")!.clip;
  assert.ok(b.duration >= 1 / FPS - 1e-9);
});

// ── split / merge ──────────────────────────────────────────
test("split preserves total duration and keeps left id", () => {
  const before = locate(abc(), "B")!.clip;
  const d = splitClip(abc(), "B", 4.5); // B spans 3..6, split at 4.5
  ok(d);
  const parts = d.tracks[0].clips;
  assert.equal(parts.length, 4);
  const b = parts.find((c) => c.id === "B")!;
  const right = parts[parts.indexOf(b) + 1];
  assert.equal(+(b.duration + right.duration).toFixed(4), before.duration);
  assert.equal(+right.in.toFixed(4), 1.5); // right half's source in = left length
});
test("merge is the inverse of split (length unchanged)", () => {
  const split = splitClip(abc(), "B", 4.5);
  const rightId = split.tracks[0].clips[2].id;
  const d = mergeClips(split, "B", rightId);
  ok(d);
  assert.deepEqual(rows(d, "v"), [["A", 0, 3], ["B", 3, 3], ["C", 6, 3]]);
});

// ── move (remove + insert) ─────────────────────────────────
test("move right reorders and stays gap-free", () => {
  const d = moveClip(abc(), "A", 100); // drag A to the end
  ok(d);
  assert.deepEqual(rows(d, "v"), [["B", 0, 3], ["C", 3, 3], ["A", 6, 3]]);
});
test("move left reorders and stays gap-free", () => {
  const d = moveClip(abc(), "C", 0); // drag C to the front
  ok(d);
  assert.deepEqual(rows(d, "v"), [["C", 0, 3], ["A", 3, 3], ["B", 6, 3]]);
});
test("move never leaves an overlap", () => {
  const d = moveClip(abc(), "A", 4);
  ok(d); // validate() rejects overlaps, so ok() proves it
});

test("drag across tracks: source gap closes, target ripples", () => {
  const d0 = doc([track("v1", [clip("A", 0, 3), clip("B", 3, 3)]), track("v2", [clip("X", 0, 4)])]);
  const d = moveClip(d0, "B", 0, "v2");
  ok(d);
  assert.deepEqual(rows(d, "v1"), [["A", 0, 3]]); // gap where B was is closed
  assert.deepEqual(rows(d, "v2"), [["B", 0, 3], ["X", 3, 4]]); // B inserted, X rippled
});

// ── ripple scope ───────────────────────────────────────────
test("scope 'track' leaves other tracks untouched", () => {
  const d0 = doc([track("v1", [clip("A", 0, 3), clip("B", 3, 3)]), track("v2", [clip("X", 3, 2)])]);
  const d = insertClip(d0, "v1", clip("N", 0, 2), 0, "track");
  ok(d);
  assert.deepEqual(rows(d, "v2"), [["X", 3, 2]]); // unchanged
});
test("scope 'all' shifts every track after the edit point", () => {
  const d0 = doc([track("v1", [clip("A", 0, 3), clip("B", 3, 3)]), track("v2", [clip("X", 3, 2)])]);
  const d = insertClip(d0, "v1", clip("N", 0, 2), 0, "all");
  ok(d);
  assert.deepEqual(rows(d, "v2"), [["X", 5, 2]]); // shifted right by inserted length
});

// ── connected clips ────────────────────────────────────────
test("linked overlay follows its parent when the parent moves", () => {
  let d = doc([track("v", [clip("A", 0, 3), clip("B", 3, 3)]), track("ov", [clip("cap", 3, 3)], false)]);
  d = linkClips(d, "B", "cap");
  d = moveClip(d, "B", 0); // B to front → new start 0
  ok(d);
  const cap = locate(d, "cap")!.clip;
  assert.equal(+cap.start.toFixed(4), 0); // moved by the same -3s delta
});
test("deleting a parent detaches its linked clips (never orphaned refs)", () => {
  let d = doc([track("v", [clip("A", 0, 3)]), track("ov", [clip("cap", 0, 3)], false)]);
  d = linkClips(d, "A", "cap");
  d = removeClip(d, "A", { linked: "detach" });
  ok(d);
  const cap = locate(d, "cap")!.clip;
  assert.equal(cap.parentClipId, undefined);
});
test("deleting a parent can cascade-delete linked clips", () => {
  let d = doc([track("v", [clip("A", 0, 3)]), track("ov", [clip("cap", 0, 3)], false)]);
  d = linkClips(d, "A", "cap");
  d = removeClip(d, "A", { linked: "delete" });
  ok(d);
  assert.equal(locate(d, "cap"), null);
});

// ── duplicate ──────────────────────────────────────────────
test("duplicate inserts a copy after the original and ripples", () => {
  const { doc: d, newId } = duplicateClip(abc(), "A");
  ok(d);
  assert.notEqual(newId, "A");
  assert.deepEqual(rows(d, "v"), [["A", 0, 3], [newId, 3, 3], ["B", 6, 3], ["C", 9, 3]]);
});

// ── purity / immutability (underpins snapshot undo/redo) ────
test("commands never mutate the input doc", () => {
  const before = abc();
  const snapshot = JSON.stringify(before);
  insertClip(before, "v", clip("X", 0, 2), 3);
  removeClip(before, "B");
  moveClip(before, "A", 9);
  trimClip(before, "B", "end", 2);
  assert.equal(JSON.stringify(before), snapshot); // original untouched → prior snapshot is a valid undo target
});

// ── edge cases ─────────────────────────────────────────────
test("empty timeline: operations are no-ops and stay valid", () => {
  const d0 = doc([track("v", [])]);
  ok(removeClip(d0, "nope"));
  ok(moveClip(d0, "nope", 5));
  ok(trimClip(d0, "nope", "end", 2));
});
test("single clip timeline", () => {
  const d = insertClip(doc([track("v", [clip("A", 0, 3)])]), "v", clip("B", 0, 2), 1.5);
  ok(d);
  assert.equal(d.tracks[0].clips.length, 2);
});
test("very long and very small clips coexist", () => {
  const d = doc([track("v", [clip("long", 0, 3600), clip("tiny", 3600, 1 / FPS)])]);
  ok(d);
  const t = trimClip(d, "long", "end", -1);
  ok(t);
});

// ── frame precision (no drift) ─────────────────────────────
test("insert time snaps to whole frames", () => {
  const d = insertClip(abc(), "v", clip("X", 0, 2), 3.3333); // 3.3333s is not on a frame at 30fps
  ok(d);
  for (const c of d.tracks[0].clips) {
    assert.ok(Number.isInteger(Math.round(c.start * FPS)), "start on frame grid");
    assert.equal(Math.abs(c.start * FPS - Math.round(c.start * FPS)) < 1e-6, true);
  }
});
test("repeated +1/-1 frame trims never drift", () => {
  let d = abc();
  const step = 1 / FPS;
  for (let i = 0; i < 500; i++) {
    d = trimClip(d, "B", "end", step);
    d = trimClip(d, "B", "end", -step);
  }
  ok(d);
  assert.equal(+locate(d, "B")!.clip.duration.toFixed(6), 3); // exactly back to 3s, no accumulation
});

// ── scale ──────────────────────────────────────────────────
test("1000-clip timeline stays valid after an edit", () => {
  const clips = Array.from({ length: 1000 }, (_, i) => clip(`c${i}`, i * 2, 2));
  let d = doc([track("v", clips)]);
  d = insertClip(d, "v", clip("mid", 0, 2), 1000); // insert around the middle
  ok(d);
  assert.equal(d.tracks[0].clips.length, 1001);
  d = removeClip(d, "c500");
  ok(d);
  assert.equal(d.tracks[0].clips.length, 1000);
});
