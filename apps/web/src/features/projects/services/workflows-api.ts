import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import type { Workflow, WorkflowGraph } from "../types";

// Multipart upload with progress. Uses XHR (fetch can't report upload progress)
// and bypasses the JSON `api` helper so the browser sets the multipart boundary.
export function uploadAsset(
	file: File,
	onProgress?: (percent: number) => void,
): Promise<{
	key: string;
	url: string;
	kind: "image" | "video" | "audio";
	name: string;
}> {
	return new Promise((resolve, reject) => {
		const token = useSession.getState().token;
		const form = new FormData();
		form.append("file", file);

		const xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/v1/assets/upload");
		if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable)
				onProgress?.(Math.round((e.loaded / e.total) * 100));
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				onProgress?.(100);
				resolve(JSON.parse(xhr.responseText));
			} else {
				let detail = `${xhr.status} ${xhr.statusText}`;
				try {
					detail = JSON.parse(xhr.responseText).detail ?? detail;
				} catch {
					/* keep status text */
				}
				reject(new Error(detail));
			}
		};
		xhr.onerror = () => reject(new Error("Upload failed"));
		xhr.send(form);
	});
}

export function listWorkflows(): Promise<Workflow[]> {
	return api<Workflow[]>("/workflows");
}

export function getWorkflow(id: string): Promise<Workflow> {
	return api<Workflow>(`/workflows/${id}`);
}

export function createWorkflow(
	name: string,
	graph?: WorkflowGraph,
): Promise<Workflow> {
	return api<Workflow>("/workflows", {
		method: "POST",
		body: JSON.stringify({ name, graph: graph ?? { nodes: [], edges: [] } }),
	});
}

export function updateWorkflow(
	id: string,
	patch: { name?: string; graph?: WorkflowGraph },
): Promise<Workflow> {
	return api<Workflow>(`/workflows/${id}`, {
		method: "PATCH",
		body: JSON.stringify(patch),
	});
}

export function deleteWorkflow(id: string): Promise<void> {
	return api<void>(`/workflows/${id}`, { method: "DELETE" });
}

// node_id -> freshly presigned URL of each node's latest media output.
export function getWorkflowOutputs(
	id: string,
): Promise<Record<string, string>> {
	return api<Record<string, string>>(`/workflows/${id}/outputs`);
}

type ImageEdit = { key: string; url: string; kind: "image" };

// Server-side crop (avoids browser CORS on the presigned URL).
export function cropAsset(
	sourceUrl: string,
	rect: { x: number; y: number; width: number; height: number },
): Promise<ImageEdit> {
	return api<ImageEdit>("/assets/crop", {
		method: "POST",
		body: JSON.stringify({ source_url: sourceUrl, ...rect }),
	});
}

// Server-side composite of an annotation PNG over the source image.
export function compositeAsset(
	sourceUrl: string,
	overlayPng: string,
): Promise<ImageEdit> {
	return api<ImageEdit>("/assets/composite", {
		method: "POST",
		body: JSON.stringify({ source_url: sourceUrl, overlay_png: overlayPng }),
	});
}

// AI image-to-image edit (Expand, Three-view, Change angle, storyboards, …).
export function editAsset(
	sourceUrl: string,
	prompt: string,
	opts?: { model?: string; size?: string },
): Promise<ImageEdit> {
	return api<ImageEdit>("/assets/edit", {
		method: "POST",
		body: JSON.stringify({ source_url: sourceUrl, prompt, ...opts }),
	});
}

// Slice an image into an r×c grid of separate images.
export function gridExtract(
	sourceUrl: string,
	rows: number,
	cols: number,
): Promise<ImageEdit[]> {
	return api<ImageEdit[]>("/assets/grid-extract", {
		method: "POST",
		body: JSON.stringify({ source_url: sourceUrl, rows, cols }),
	});
}

// Deterministic light tune (brightness / contrast / saturation / warmth).
export function adjustAsset(
	sourceUrl: string,
	params: {
		brightness?: number;
		contrast?: number;
		saturation?: number;
		temperature?: number;
	},
): Promise<ImageEdit> {
	return api<ImageEdit>("/assets/adjust", {
		method: "POST",
		body: JSON.stringify({ source_url: sourceUrl, ...params }),
	});
}

// ── Video edits (ffmpeg, server-side) ────────────────────────────────────────
type MediaResult = { key: string; url: string };

export function extractFrame(
	sourceUrl: string,
	time: number,
): Promise<MediaResult> {
	return api<MediaResult>("/assets/video/frame", {
		method: "POST",
		body: JSON.stringify({ source_url: sourceUrl, time }),
	});
}

export function reframeVideo(
	sourceUrl: string,
	ratio: string,
): Promise<MediaResult> {
	return api<MediaResult>("/assets/video/reframe", {
		method: "POST",
		body: JSON.stringify({ source_url: sourceUrl, ratio }),
	});
}

export function trimVideo(
	sourceUrl: string,
	start: number,
	end: number,
): Promise<MediaResult> {
	return api<MediaResult>("/assets/video/trim", {
		method: "POST",
		body: JSON.stringify({ source_url: sourceUrl, start, end }),
	});
}

export function upscaleVideo(
	sourceUrl: string,
	scale: number,
): Promise<MediaResult> {
	return api<MediaResult>("/assets/video/upscale", {
		method: "POST",
		body: JSON.stringify({ source_url: sourceUrl, scale }),
	});
}
