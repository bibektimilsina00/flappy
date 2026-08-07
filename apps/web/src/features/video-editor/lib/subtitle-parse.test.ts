import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSubtitles } from "./subtitle-parse.ts";

const SRT = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:04,500 --> 00:00:06,000
Second
line
`;

const VTT = `WEBVTT

00:01.000 --> 00:03.500
No hours here
`;

test("parses SRT with index lines + comma ms", () => {
  const cues = parseSubtitles(SRT);
  assert.equal(cues.length, 2);
  assert.deepEqual(cues[0], { start: 1, end: 4, text: "Hello world" });
  assert.equal(cues[1].text, "Second\nline"); // multi-line body joined
});

test("parses VTT, skips the WEBVTT header, dot ms, MM:SS", () => {
  const cues = parseSubtitles(VTT);
  assert.equal(cues.length, 1);
  assert.deepEqual(cues[0], { start: 1, end: 3.5, text: "No hours here" });
});

test("drops malformed / zero-length cues", () => {
  assert.equal(parseSubtitles("not a subtitle file").length, 0);
  assert.equal(parseSubtitles("00:00:02,000 --> 00:00:02,000\nsame").length, 0); // end <= start
});
