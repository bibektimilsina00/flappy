"use client";

import { create } from "zustand";
import type { LibraryAsset } from "../types";

interface AssetsState {
  query: string;
  activeCollectionId: string | null;
  renamingCollectionId: string | null;
  previewAsset: LibraryAsset | null;
  typeFilter: "all" | "image" | "video" | "audio";
  sourceFilter: "all" | "uploaded" | "generated";
  sortOrder: "newest" | "oldest";

  setQuery: (q: string) => void;
  setActiveCollectionId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setRenamingCollectionId: (id: string | null) => void;
  setPreviewAsset: (asset: LibraryAsset | null) => void;
  setTypeFilter: (t: "all" | "image" | "video" | "audio") => void;
  setSourceFilter: (s: "all" | "uploaded" | "generated") => void;
  setSortOrder: (s: "newest" | "oldest") => void;
  resetFilters: () => void;
}

export const useAssetsStore = create<AssetsState>((set) => ({
  query: "",
  activeCollectionId: null,
  renamingCollectionId: null,
  previewAsset: null,
  typeFilter: "all",
  sourceFilter: "all",
  sortOrder: "newest",

  setQuery: (query) => set({ query }),
  setActiveCollectionId: (act) =>
    set((s) => ({ activeCollectionId: typeof act === "function" ? act(s.activeCollectionId) : act })),
  setRenamingCollectionId: (renamingCollectionId) => set({ renamingCollectionId }),
  setPreviewAsset: (previewAsset) => set({ previewAsset }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setSourceFilter: (sourceFilter) => set({ sourceFilter }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  resetFilters: () => set({ typeFilter: "all", sourceFilter: "all", sortOrder: "newest", query: "" }),
}));
