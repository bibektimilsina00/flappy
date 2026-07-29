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
}

export interface ClipsJob {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  phase: "ingest" | "transcribe" | "select" | "render";
  progress: number;
  error: string | null;
  source_url: string | null;
  source_title: string | null;
  params: Record<string, unknown>;
  duration: number | null;
  created_at: string;
  clips: ClipItem[];
}

export interface ClipsParams {
  count: number | "auto";
  duration: "auto" | "short" | "medium" | "long";
  ratio: "9:16" | "1:1" | "16:9";
  focus?: string;
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
