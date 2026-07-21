import { api } from "@/lib/api";
import type { Model } from "../types";

export function listModels(kind: string): Promise<Model[]> {
  return api<Model[]>(`/models?kind=${kind}`);
}
