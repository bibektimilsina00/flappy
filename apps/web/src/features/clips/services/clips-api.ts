import { api } from "@/lib/api";
import { authToken } from "@/lib/auth-token";
import type {
  ClipsJob,
  ClipsParams,
  CustomCaptionStyle,
  PublishResult,
  ScheduleConfig,
  ScheduledPost,
  SocialAccount,
  TikTokCreatorInfo,
} from "../types";

export function probeClipsSource(source_url: string): Promise<{
  title: string | null;
  duration: number | null;
  thumbnail: string | null;
  height: number | null;
  blocked?: boolean;
  message?: string;
}> {
  return api("/clips/probe", {
    method: "POST",
    body: JSON.stringify({ source_url }),
  });
}

export function createClipsJob(body: {
  source_url?: string;
  source_key?: string;
  source_title?: string;
  source_duration?: number;
  workflow_id?: string;
  params: ClipsParams;
}): Promise<ClipsJob> {
  return api("/clips/jobs", { method: "POST", body: JSON.stringify(body) });
}

export function estimateClipsCost(
  count: number | "auto",
  duration?: number | null,
): Promise<{ credits: number }> {
  return api(
    `/clips/estimate?count=${count}${duration ? `&duration=${duration}` : ""}`,
  );
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
  body: {
    start?: number;
    end?: number;
    caption_edits?: { start: number; end: number; text: string }[];
  },
): Promise<ClipsJob> {
  return api(`/clips/jobs/${jobId}/clips/${clipId}/rerender`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getClipDownloadUrl(
  jobId: string,
  clipId: string,
  style: string,
): Promise<{ url: string }> {
  return api(`/clips/jobs/${jobId}/clips/${clipId}/download`, {
    method: "POST",
    body: JSON.stringify({ style }),
  });
}

export function jobByWorkflow(workflowId: string): Promise<{ job_id: string }> {
  return api(`/clips/by-workflow/${workflowId}`);
}

export function bulkSchedule(
  jobId: string,
  clipIds: string[],
  config: ScheduleConfig,
): Promise<{ id: string; clip_id: string; post_at: string }[]> {
  return api(`/clips/jobs/${jobId}/schedule`, {
    method: "POST",
    body: JSON.stringify({ clip_ids: clipIds, config }),
  });
}

export function listSchedule(): Promise<ScheduledPost[]> {
  return api("/clips/schedule");
}

export function cancelScheduledPost(id: string): Promise<void> {
  return api(`/clips/schedule/${id}`, { method: "DELETE" });
}

export function clipsToProject(
  jobId: string,
  clipIds?: string[],
): Promise<{ workflow_id: string }> {
  return api(`/clips/jobs/${jobId}/to-project`, {
    method: "POST",
    body: JSON.stringify({
      clip_ids: clipIds && clipIds.length ? clipIds : null,
    }),
  });
}

export async function authDownload(
  path: string,
  filename: string,
): Promise<void> {
  const token = await authToken();
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

export async function uploadClipsSource(
  file: File,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ source_key: string; name: string }> {
  const contentType = file.type || "video/mp4";
  const { source_key, url } = await api<{ source_key: string; url: string }>(
    "/clips/upload-url",
    {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        content_type: contentType,
        size: file.size,
      }),
    },
  );

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded, e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () =>
      reject(new Error("Upload failed — check your connection."));
    xhr.send(file);
  });

  return { source_key, name: file.name };
}

export function listSocialAccounts(): Promise<SocialAccount[]> {
  return api("/social/accounts");
}

export function socialProviders(): Promise<Record<string, boolean>> {
  return api("/social/providers");
}

export function socialConnectUrl(platform: string): Promise<{ url: string }> {
  return api(`/social/${platform}/connect`);
}

export function disconnectSocialAccount(id: string): Promise<void> {
  return api(`/social/accounts/${id}`, { method: "DELETE" });
}

export function tiktokCreatorInfo(
  accountId: string,
): Promise<TikTokCreatorInfo> {
  return api(`/social/accounts/${accountId}/tiktok/creator-info`);
}

export function publishClipNow(
  jobId: string,
  clipId: string,
  body: { account_ids: string[]; caption?: string; tiktok_privacy?: string },
): Promise<PublishResult[]> {
  return api(`/clips/jobs/${jobId}/clips/${clipId}/publish`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
