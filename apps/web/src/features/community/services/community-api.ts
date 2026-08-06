import { api } from "@/lib/api";
import type { CommunityWork } from "../types";
import { COMMUNITY_WORKS } from "../lib/constants";

export async function fetchCommunityWorks(query?: string, category?: string): Promise<CommunityWork[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category && category !== "all") params.set("category", category);
    const querystring = params.toString();
    return await api<CommunityWork[]>(`/community/works${querystring ? `?${querystring}` : ""}`);
  } catch {
    // Fallback to static community works when API backend is unpopulated
    let list = COMMUNITY_WORKS;
    if (category && category !== "all") {
      list = list.filter((w) => w.badge?.toLowerCase().includes(category.toLowerCase()));
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((w) => w.title.toLowerCase().includes(q) || w.author.toLowerCase().includes(q));
    }
    return list;
  }
}

export async function toggleWorkLike(workId: string): Promise<{ liked: boolean; count: number }> {
  return api<{ liked: boolean; count: number }>(`/community/works/${workId}/like`, { method: "POST" }).catch(() => ({ liked: true, count: 1 }));
}

export async function toggleWorkBookmark(workId: string): Promise<{ bookmarked: boolean; count: number }> {
  return api<{ bookmarked: boolean; count: number }>(`/community/works/${workId}/bookmark`, { method: "POST" }).catch(() => ({ bookmarked: true, count: 1 }));
}
