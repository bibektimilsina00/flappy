import type { VideoEditorDoc } from "./types";

// Text clips → subtitle file. Returns null when the doc has no text clips.
export function buildCaptions(doc: VideoEditorDoc, format: "srt" | "vtt"): string | null {
  const cues = doc.tracks
    .flatMap((t) => t.clips)
    .filter((c) => c.kind === "text" && (c.text?.content ?? "").trim())
    .sort((a, b) => a.start - b.start);
  if (cues.length === 0) return null;

  const sep = format === "srt" ? "," : ".";
  const stamp = (s: number) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const hh = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
    const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
    const mmm = String(ms % 1000).padStart(3, "0");
    return `${hh}:${mm}:${ss}${sep}${mmm}`;
  };

  const blocks = cues.map((c, i) => {
    const head = format === "srt" ? `${i + 1}\n` : "";
    return `${head}${stamp(c.start)} --> ${stamp(c.start + c.duration)}\n${(c.text?.content ?? "").trim()}`;
  });
  return (format === "vtt" ? "WEBVTT\n\n" : "") + blocks.join("\n\n") + "\n";
}
