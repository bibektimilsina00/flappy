import assert from "node:assert/strict";
import { test } from "node:test";
import { animate } from "./animation-engine.ts";
import type { Clip } from "../types.ts";

const base = (animations?: Clip["animations"]): Clip => ({
  id: "c1",
  kind: "video",
  start: 0,
  duration: 3,
  in: 0,
  out: 3,
  speed: 1,
  volume: 1,
  transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
  keyframes: [],
  effects: [],
  animations,
});

test("no animations → identity", () => {
  const m = animate(base(), 1);
  assert.deepEqual(m, { dx: 0, dy: 0, scale: 1, rotate: 0, opacity: 1 });
});

test("fade-in hides at clip start, full mid-clip", () => {
  const clip = base({ in: "Fade" });
  assert.equal(animate(clip, 0).opacity, 0); // start = invisible
  assert.equal(animate(clip, 1.5).opacity, 1); // past the in window = full
});

test("fade-out fades toward the end", () => {
  const clip = base({ out: "Fade" });
  assert.equal(animate(clip, 1.5).opacity, 1); // before out window
  assert.ok(animate(clip, 2.95).opacity < 0.2); // near end = nearly gone
});

test("zoom-in grows scale across the clip", () => {
  const clip = base({ zoom: "Zoom In" });
  assert.ok(animate(clip, 2.9).scale > animate(clip, 0.1).scale);
});

test("outside the clip → identity", () => {
  const clip = base({ in: "Fade" });
  assert.equal(animate(clip, 5).opacity, 1);
});
