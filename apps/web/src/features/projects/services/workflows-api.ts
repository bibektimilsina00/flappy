import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import type { Workflow, WorkflowGraph } from "../types";

// Multipart upload with progress. Uses XHR (fetch can't report upload progress)
// and bypasses the JSON `api` helper so the browser sets the multipart boundary.
export function uploadAsset(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ key: string; url: string; kind: "image" | "video" | "audio" }> {
  return new Promise((resolve, reject) => {
    const token = useSession.getState().token;
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/assets/upload");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
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

export function createWorkflow(name: string): Promise<Workflow> {
  return api<Workflow>("/workflows", {
    method: "POST",
    body: JSON.stringify({ name, graph: { nodes: [], edges: [] } }),
  });
}

export function updateWorkflow(
  id: string,
  patch: { name?: string; graph?: WorkflowGraph },
): Promise<Workflow> {
  return api<Workflow>(`/workflows/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deleteWorkflow(id: string): Promise<void> {
  return api<void>(`/workflows/${id}`, { method: "DELETE" });
}

// node_id -> freshly presigned URL of each node's latest media output.
export function getWorkflowOutputs(id: string): Promise<Record<string, string>> {
  return api<Record<string, string>>(`/workflows/${id}/outputs`);
}
