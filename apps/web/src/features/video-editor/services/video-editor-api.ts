import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import type { VideoEditorDoc, VideoEditorProject } from "../types";

// Load (seeds on first open) the timeline editor project for a workflow.
export function getEditorProject(
	workflowId: string,
): Promise<VideoEditorProject> {
	return api<VideoEditorProject>(`/video-editor/projects/${workflowId}`);
}

// Autosave title / doc.
export function saveEditorProject(
	projectId: string,
	patch: { title?: string; doc?: VideoEditorDoc },
): Promise<{ id: string; title: string }> {
	return api<{ id: string; title: string }>(
		`/video-editor/projects/${projectId}`,
		{
			method: "PATCH",
			body: JSON.stringify(patch),
		},
	);
}

// Composite the timeline (ffmpeg, server-side) and return its URL. Optional
// height/fps override the canvas resolution and frame rate.
export function renderEditorProject(
	projectId: string,
	opts?: { format?: "mp4" | "gif"; height?: number; fps?: number },
): Promise<{ key: string; url: string; kind: string; duration: number }> {
	const q = new URLSearchParams({ format: opts?.format ?? "mp4" });
	if (opts?.height) q.set("height", String(opts.height));
	if (opts?.fps) q.set("fps", String(opts.fps));
	return api(`/video-editor/projects/${projectId}/render?${q}`, {
		method: "POST",
	});
}

// Publish a rendered MP4 (its storage key) to the selected connected accounts.
// Returns one post per account; poll listSchedule() for live status + result URL.
export function publishEditorProject(
	projectId: string,
	body: {
		render_key: string;
		account_ids: string[];
		title?: string;
		caption?: string;
		tiktok_privacy?: string;
	},
): Promise<import("@/features/clips").PublishResult[]> {
	return api(`/video-editor/projects/${projectId}/publish`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

// Create (or revoke) a public share link for the project's latest render.
export function shareEditorProject(
	projectId: string,
	mode: "review" | "presentation",
	revoke = false,
): Promise<{ mode: string; token: string | null }> {
	return api(`/video-editor/projects/${projectId}/share`, {
		method: "POST",
		body: JSON.stringify({ mode, revoke }),
	});
}

// Public share page payload (no auth — token is the secret).
export function getSharedProject(token: string): Promise<{
	title: string;
	mode: "review" | "presentation";
	video_url: string;
	comments?: {
		id: string;
		author: string;
		text: string;
		at: number;
		created_at: string;
	}[];
}> {
	return api(`/video-editor/shared/${token}`);
}

// Public: leave a review comment on a shared project.
export function addSharedComment(
	token: string,
	body: { author: string; text: string; at: number },
): Promise<{
	id: string;
	author: string;
	text: string;
	at: number;
	created_at: string;
}> {
	return api(`/video-editor/shared/${token}/comments`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

// Kick off an AI generation (text→image / text→video / image→video / extend). The
// server appends a node to the shared workflow graph and runs it; poll the returned
// execution id and refresh the project to surface the result asset. Throws on 402
// (premium model / insufficient credits) with the server's detail message.
export function generateInProject(
	workflowId: string,
	body: {
		kind: "image" | "video" | "audio";
		prompt: string;
		model?: string | null;
		params?: Record<string, unknown>;
		source_asset_id?: string | null;
	},
): Promise<{ execution_id: string; node_id: string }> {
	return api(`/video-editor/projects/${workflowId}/generate`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

// Poll a generation's status.
export function getExecution(
	id: string,
): Promise<{ id: string; status: string; error?: string | null }> {
	return api(`/executions/${id}`);
}

export type SubtitleSegment = { start: number; end: number; text: string };

export type ProjectVersion = { id: string; ts: string; label?: string | null };

export function saveVersion(projectId: string, doc: unknown, label?: string): Promise<ProjectVersion> {
	return api(`/video-editor/projects/${projectId}/versions`, { method: "POST", body: JSON.stringify({ doc, label: label ?? null }) });
}
export function listVersions(projectId: string): Promise<{ versions: ProjectVersion[] }> {
	return api(`/video-editor/projects/${projectId}/versions`);
}
export function restoreVersion(projectId: string, versionId: string): Promise<{ doc: unknown }> {
	return api(`/video-editor/projects/${projectId}/versions/${versionId}/restore`, { method: "POST" });
}

export type Template = { id: string; name: string; ts: string; clips: number };

// Save the current project as a reusable template.
export function saveTemplate(workflowId: string, name?: string): Promise<Template> {
	return api("/video-editor/templates", { method: "POST", body: JSON.stringify({ workflow_id: workflowId, name: name ?? null }) });
}
export function listTemplates(): Promise<{ templates: Template[] }> {
	return api("/video-editor/templates");
}
// Spin a template into a fresh workflow; returns its id (route param).
export function useTemplate(templateId: string): Promise<{ workflow_id: string }> {
	return api(`/video-editor/templates/${templateId}/use`, { method: "POST" });
}
export function deleteTemplate(templateId: string): Promise<{ ok: boolean }> {
	return api(`/video-editor/templates/${templateId}`, { method: "DELETE" });
}

// Generate an AI morph transition between two video clips (async on the worker).
// Poll the execution, then insert the result at `start` (the clip boundary).
export function startTransitionMorph(projectId: string, fromClipId: string, toClipId: string, prompt?: string): Promise<{ execution_id: string; node_id: string; start: number }> {
	return api(`/video-editor/projects/${projectId}/transition-morph`, {
		method: "POST",
		body: JSON.stringify({ from_clip_id: fromClipId, to_clip_id: toClipId, prompt: prompt ?? null }),
	});
}

// Dub a clip into another language: transcribe → translate → TTS (async). Poll the
// execution, then place the dubbed audio and mute the original.
export function startDub(projectId: string, clipId: string, targetLanguage: string, voice?: string): Promise<{ execution_id: string; node_id: string; source_clip_id: string; start: number; duration: number }> {
	return api(`/video-editor/projects/${projectId}/dub`, {
		method: "POST",
		body: JSON.stringify({ clip_id: clipId, target_language: targetLanguage, voice: voice ?? null }),
	});
}

export type BrollItem = { asset_id: string; kind: string; url: string; start: number; duration: number; query: string };

// Transcribe the clip → topic windows → a stock photo per topic. The client
// inserts the returned image clips at their timeline ranges. Needs PEXELS_API_KEY.
export function magicBroll(projectId: string, clipId?: string): Promise<{ items: BrollItem[] }> {
	return api(`/video-editor/projects/${projectId}/broll`, {
		method: "POST",
		body: JSON.stringify({ clip_id: clipId ?? null }),
	});
}

export type StockResult = { id: string; thumb?: string; url: string; kind: "image" | "video"; duration?: number };

// Search Pixels/stock. Throws (with the server detail) on 503 when unconfigured.
export function searchStock(q: string, kind: "image" | "video"): Promise<{ results: StockResult[] }> {
	return api(`/video-editor/stock/search?q=${encodeURIComponent(q)}&kind=${kind}`);
}

// Import a stock asset from an allow-listed CDN into the project pool.
export function importUrl(projectId: string, url: string, kind: string): Promise<{ id: string; kind: string; url: string }> {
	return api(`/video-editor/projects/${projectId}/import-url`, {
		method: "POST",
		body: JSON.stringify({ url, kind }),
	});
}

export type BrandKitItem = { id: string; kind: string; name: string; color?: string; font?: string; url?: string };

export function listBrandKit(): Promise<{ items: BrandKitItem[] }> {
	return api("/video-editor/brand-kit");
}
export function addToBrandKit(body: { kind: string; workflow_id?: string; asset_id?: string; color?: string; font?: string; name?: string }): Promise<BrandKitItem> {
	return api("/video-editor/brand-kit", { method: "POST", body: JSON.stringify(body) });
}
export function removeFromBrandKit(itemId: string): Promise<{ ok: boolean }> {
	return api(`/video-editor/brand-kit/${itemId}`, { method: "DELETE" });
}
export function addBrandKitToProject(workflowId: string, itemId: string): Promise<{ id: string; kind: string; url: string }> {
	return api(`/video-editor/projects/${workflowId}/brand-kit/${itemId}/add`, { method: "POST" });
}

// Magic Cut an audio clip (transcribe → cut filler words); returns a new asset.
export function magicCutClip(
	projectId: string,
	clipId: string,
): Promise<{ asset_id: string; kind: string; url: string; duration: number }> {
	return api(`/video-editor/projects/${projectId}/magic-cut`, {
		method: "POST",
		body: JSON.stringify({ clip_id: clipId }),
	});
}

// Kick off a slow per-clip op (e.g. video background matting) on the worker.
// Poll getExecution(execution_id), then read listExecutionAssets for the result.
export function startClipOp(projectId: string, clipId: string, op: "remove_bg_video" | "eye_contact" | "face_filter" | "background_expand"): Promise<{ execution_id: string; node_id: string }> {
	return api(`/video-editor/projects/${projectId}/clip-op`, {
		method: "POST",
		body: JSON.stringify({ clip_id: clipId, op }),
	});
}

export type ExecutionAsset = { id: string; node_id: string; kind: string; url: string };
export function listExecutionAssets(executionId: string): Promise<ExecutionAsset[]> {
	return api(`/executions/${executionId}/assets`);
}

// Remove an image clip's background (Replicate matting); returns a cutout PNG asset.
export function removeClipBackground(
	projectId: string,
	clipId: string,
): Promise<{ asset_id: string; kind: string; url: string; duration?: number }> {
	return api(`/video-editor/projects/${projectId}/remove-bg`, {
		method: "POST",
		body: JSON.stringify({ clip_id: clipId }),
	});
}

// Chroma-key (green screen) a video clip; returns a new transparent-webm asset.
export function chromaKeyClip(
	projectId: string,
	clipId: string,
	color?: string,
): Promise<{ asset_id: string; kind: string; url: string; duration: number }> {
	return api(`/video-editor/projects/${projectId}/chroma-key`, {
		method: "POST",
		body: JSON.stringify({ clip_id: clipId, color: color ?? null }),
	});
}

// Extract a video clip's audio into a new pool asset.
export function detachClipAudio(
	projectId: string,
	clipId: string,
): Promise<{ asset_id: string; kind: string; url: string; duration: number }> {
	return api(`/video-editor/projects/${projectId}/detach-audio`, {
		method: "POST",
		body: JSON.stringify({ clip_id: clipId }),
	});
}

// Clone the project into a fresh workflow; returns its id (route param).
export function duplicateProject(workflowId: string): Promise<{ workflow_id: string }> {
	return api(`/video-editor/projects/${workflowId}/duplicate`, { method: "POST" });
}

// Run an ffmpeg audio enhancement on a clip; returns a new pool asset.
export function enhanceClipAudio(
	projectId: string,
	clipId: string,
	op: "denoise" | "remove_silences",
): Promise<{ asset_id: string; kind: string; url: string; duration: number }> {
	return api(`/video-editor/projects/${projectId}/enhance`, {
		method: "POST",
		body: JSON.stringify({ clip_id: clipId, op }),
	});
}

// Transcribe the project's audio into timeline-mapped caption segments.
export function generateSubtitles(
	projectId: string,
	sourceAssetId?: string | null,
): Promise<{ segments: SubtitleSegment[] }> {
	return api(`/video-editor/projects/${projectId}/subtitles`, {
		method: "POST",
		body: JSON.stringify({ source_asset_id: sourceAssetId ?? null }),
	});
}

// Upload media from the editor; the server adds it to the workflow graph so the
// canvas shares it too. (Multipart, so it bypasses the JSON `api` helper.)
export async function uploadToProject(
	workflowId: string,
	file: File,
): Promise<{ id: string; kind: string; url: string; name: string }> {
	const token = useSession.getState().token;
	const form = new FormData();
	form.append("file", file);
	const res = await fetch(
		`/api/v1/video-editor/projects/${workflowId}/upload`,
		{
			method: "POST",
			headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			body: form,
		},
	);
	if (!res.ok) {
		const detail = await res
			.json()
			.then((j) => j.detail)
			.catch(() => null);
		throw new Error(detail ?? `Upload failed (${res.status})`);
	}
	return res.json();
}
