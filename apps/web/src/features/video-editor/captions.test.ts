import assert from "node:assert/strict";
import test from "node:test";
import { buildCaptions } from "./lib/captions.ts";
import type { VideoEditorDoc } from "./types.ts";

const clip = (start: number, duration: number, content: string) => ({
  id: `c${start}`,
  kind: "text",
  start,
  duration,
  in: 0,
  out: duration,
  speed: 1,
  volume: 1,
  transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
  keyframes: [],
  effects: [],
  text: { content },
});

const doc = (clips: ReturnType<typeof clip>[]): VideoEditorDoc => ({
  version: 1,
  fps: 30,
  width: 1080,
  height: 1920,
  duration: 60,
  background: "#000",
  tracks: [{ id: "t1", kind: "text", name: "T1", locked: false, hidden: false, muted: false, clips }],
  markers: [],
});

test("srt: numbered cues, comma millis, sorted by start", () => {
  const out = buildCaptions(doc([clip(61.5, 2, "Second"), clip(0, 1.25, "First")]), "srt");
  assert.equal(
    out,
    "1\n00:00:00,000 --> 00:00:01,250\nFirst\n\n2\n00:01:01,500 --> 00:01:03,500\nSecond\n",
  );
});

test("vtt: header, dot millis, no numbering", () => {
  const out = buildCaptions(doc([clip(0, 1, "Hi")]), "vtt");
  assert.equal(out, "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHi\n");
});

test("no text clips -> null", () => {
  assert.equal(buildCaptions(doc([]), "srt"), null);
  assert.equal(buildCaptions(doc([clip(0, 1, "  ")]), "srt"), null);
});
