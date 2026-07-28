import { api } from "@/lib/api";

export interface LibraryAsset {
  id: string;
  kind: string; // image | video | audio
  name: string;
  url: string;
  created_at: string;
  source: "uploaded" | "generated";
}

export interface Collection {
  id: string;
  name: string;
  asset_ids: string[];
  created_at: string;
  updated_at: string;
}

// Every media asset in the workspace (generated + uploaded), newest first.
export function getLibrary(): Promise<LibraryAsset[]> {
  return api<LibraryAsset[]>("/assets/library");
}

export function getCollections(): Promise<Collection[]> {
  return api<Collection[]>("/collections");
}

export function createCollection(name: string): Promise<Collection> {
  return api<Collection>("/collections", { method: "POST", body: JSON.stringify({ name }) });
}

export function updateCollection(
  id: string,
  patch: { name?: string; add?: string[]; remove?: string[] },
): Promise<Collection> {
  return api<Collection>(`/collections/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deleteCollection(id: string): Promise<void> {
  return api<void>(`/collections/${id}`, { method: "DELETE" });
}
