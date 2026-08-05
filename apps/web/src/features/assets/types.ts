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
