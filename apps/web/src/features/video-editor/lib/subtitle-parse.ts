// Parse an SRT or WebVTT file into timed cues. Tolerant of both `,` and `.`
// millisecond separators, optional index lines, and the WEBVTT header.

export type Cue = { start: number; end: number; text: string };

// "HH:MM:SS,mmm" | "HH:MM:SS.mmm" | "MM:SS.mmm" -> seconds (NaN on no match).
function parseTime(s: string): number {
  const m = s.trim().replace(",", ".").match(/(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?/);
  if (!m) return Number.NaN;
  const [, h, mm, ss, ms] = m;
  return (h ? +h * 3600 : 0) + +mm * 60 + +ss + (ms ? +`0.${ms}` : 0);
}

export function parseSubtitles(input: string): Cue[] {
  const text = input.replace(/^﻿/, "").replace(/\r/g, "");
  const cues: Cue[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim());
    const idx = lines.findIndex((l) => l.includes("-->"));
    if (idx === -1) continue; // header / index-only / blank block
    const [a, b] = lines[idx].split("-->");
    const start = parseTime(a ?? "");
    const end = parseTime(b ?? "");
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
    const body = lines
      .slice(idx + 1)
      .filter(Boolean)
      .join("\n")
      .trim();
    if (body) cues.push({ start, end, text: body });
  }
  return cues;
}
