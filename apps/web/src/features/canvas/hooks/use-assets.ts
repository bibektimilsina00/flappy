import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AssetItem {
  id: string;
  kind: string; // image | video | audio | text
  url: string;
  created_at: string;
}

// All assets in the workspace (newest first). Enabled lazily so we only fetch
// when a panel that needs it opens.
export function useAssets(enabled: boolean) {
  return useQuery({
    queryKey: ["assets"],
    queryFn: () => api<AssetItem[]>("/assets"),
    enabled,
  });
}
