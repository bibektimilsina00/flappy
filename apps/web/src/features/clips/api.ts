import { api } from "@/lib/api";
import { useSession } from "@/stores/session";

export interface ClipItem {
  id: string;
  title: string;
  score: number;
  reason: string;
  start: number;
  end: number;
  duration: number;
  key: string;
  url: string | null;
  status?: "ready" | "rendering" | "failed";
  clean?: boolean; // master has no burned captions (overlay/burn apply)
  error?: string;
  caption_edits?: { start: number; end: number; text: string }[] | null;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  words?: { w: string; s: number; e: number; hl?: boolean }[];
}

export interface ClipsJob {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  phase: "ingest" | "transcribe" | "select" | "render";
  progress: number;
  error: string | null;
  source_url: string | null;
  source_title: string | null;
  source_thumb_url: string | null;
  params: Record<string, unknown>;
  duration: number | null;
  created_at: string;
  phase_started_at: string | null;
  clips: ClipItem[];
  transcript?: TranscriptSegment[]; // only on single-job GET
  source_media_url?: string | null; // presigned source video (single-job GET)
}

export interface CustomCaptionStyle {
  name: string;
  color: string; // #RRGGBB base text color
  highlight: string; // active-word color
  size: "s" | "m" | "l";
  bold: boolean;
  uppercase: boolean;
  box: boolean;
  position: "bottom" | "middle";
  // top banner with the clip title, burned for the whole clip ("none" bg = outlined text)
  headline?: { enabled: boolean; bg: string; color: string };
  layout?: "auto" | "fill" | "fit"; // fit letterboxes onto `bg`
  font?: "inter" | "poppins" | "anton" | "bangers"; // inter = legacy alias of poppins
  size_px?: number; // overrides size when set (ASS units per 400px height)
  align?: "left" | "center" | "right";
  italic?: boolean;
  underline?: boolean;
  spacing?: number; // letter spacing (ASS units)
  words_per_line?: number; // caption line density (2-8)
  shadow?: boolean;
  stroke?: { width: number; color: string }; // outline; width 0 = off
  box_color?: string; // background box colour
  bg?: string; // letterbox colour for fit layout
  logo?: string | null; // data URL, overlaid top-right on burns + player
  subtitles?: boolean; // false = headline/logo only
}

export interface ScheduleConfig {
  enabled: boolean;
  min_score: number | null;
  per_day: number;
  mode: "all" | "days";
  days: number;
  start_date: string; // YYYY-MM-DD
  window_start: string; // HH:MM
  window_end: string;
  tz: string; // IANA name
}

export interface ScheduledPost {
  id: string;
  job_id: string;
  clip_id: string;
  title: string | null;
  post_at: string;
  status: "scheduled" | "due";
  score: number | null;
  url: string | null;
}

export interface ClipsParams {
  count: number | "auto";
  duration: "auto" | string[]; // "auto" or multi-selected length bands
  ratio: "9:16" | "1:1" | "16:9";
  focus?: string;
  captions: boolean;
  caption_style: string; // preset id or "custom"
  caption_custom?: CustomCaptionStyle | null;
  framing: boolean;
  add_emojis: boolean;
  highlight_keywords: boolean;
  censor: boolean;
  schedule?: ScheduleConfig;
}

// Read a link's metadata (title/thumb/duration) before starting a job.
export function probeClipsSource(source_url: string): Promise<{
  title: string | null;
  duration: number | null;
  thumbnail: string | null;
  height: number | null;
}> {
  return api("/clips/probe", { method: "POST", body: JSON.stringify({ source_url }) });
}

export function createClipsJob(body: {
  source_url?: string;
  source_key?: string;
  source_title?: string;
  params: ClipsParams;
}): Promise<ClipsJob> {
  return api("/clips/jobs", { method: "POST", body: JSON.stringify(body) });
}

export function listClipsJobs(): Promise<ClipsJob[]> {
  return api("/clips/jobs");
}

export function getClipsJob(id: string): Promise<ClipsJob> {
  return api(`/clips/jobs/${id}`);
}

export function deleteClipsJob(id: string): Promise<void> {
  return api(`/clips/jobs/${id}`, { method: "DELETE" });
}

export function rerenderClip(
  jobId: string,
  clipId: string,
  body: { start?: number; end?: number; caption_edits?: { start: number; end: number; text: string }[] },
): Promise<ClipsJob> {
  return api(`/clips/jobs/${jobId}/clips/${clipId}/rerender`, { method: "POST", body: JSON.stringify(body) });
}

// Resolve a downloadable MP4 URL (clean master or lazily-burned captions).
export function getClipDownloadUrl(
  jobId: string,
  clipId: string,
  style: string, // "none" | preset id | "custom"
): Promise<{ url: string }> {
  return api(`/clips/jobs/${jobId}/clips/${clipId}/download`, {
    method: "POST",
    body: JSON.stringify({ style }),
  });
}

export function listSchedule(): Promise<ScheduledPost[]> {
  return api("/clips/schedule");
}

export function cancelScheduledPost(id: string): Promise<void> {
  return api(`/clips/schedule/${id}`, { method: "DELETE" });
}

export function clipsToProject(jobId: string, clipId?: string): Promise<{ workflow_id: string }> {
  return api(`/clips/jobs/${jobId}/to-project`, {
    method: "POST",
    body: JSON.stringify({ clip_id: clipId ?? null }),
  });
}

// Authorized binary download (zip / srt need the JWT header, so no plain <a href>).
export async function authDownload(path: string, filename: string): Promise<void> {
  const token = useSession.getState().token;
  const res = await fetch(`/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Multipart, so it bypasses the JSON api helper (same pattern as editor uploads).
export async function uploadClipsSource(file: File): Promise<{ source_key: string; name: string }> {
  const token = useSession.getState().token;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/v1/clips/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((j) => j.detail)
      .catch(() => null);
    throw new Error(detail ?? `Upload failed (${res.status})`);
  }
  return res.json();
}
