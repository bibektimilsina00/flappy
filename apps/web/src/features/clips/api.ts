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
  error?: string;
  caption_edits?: { start: number; end: number; text: string }[] | null;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  words?: { w: string; s: number; e: number }[];
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
}

export interface ClipsParams {
  count: number | "auto";
  duration: "auto" | "short" | "medium" | "long";
  ratio: "9:16" | "1:1" | "16:9";
  focus?: string;
  captions: boolean;
  caption_style: "clean" | "bold" | "highlight";
  framing: boolean;
}

export function createClipsJob(body: {
  source_url?: string;
  source_key?: string;
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
  style: "none" | "clean" | "bold" | "highlight",
): Promise<{ url: string }> {
  return api(`/clips/jobs/${jobId}/clips/${clipId}/download`, {
    method: "POST",
    body: JSON.stringify({ style }),
  });
}

export function clipsToProject(jobId: string): Promise<{ workflow_id: string }> {
  return api(`/clips/jobs/${jobId}/to-project`, { method: "POST" });
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
