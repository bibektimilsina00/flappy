import { create } from "zustand";

interface CommunityStore {
  searchQuery: string;
  selectedCategory: string;
  likedIds: Set<string>;
  bookmarkedIds: Set<string>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  toggleLike: (id: string) => void;
  toggleBookmark: (id: string) => void;
}

export const useCommunityStore = create<CommunityStore>((set) => ({
  searchQuery: "",
  selectedCategory: "all",
  likedIds: new Set<string>(),
  bookmarkedIds: new Set<string>(),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  toggleLike: (id) =>
    set((state) => {
      const next = new Set(state.likedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { likedIds: next };
    }),
  toggleBookmark: (id) =>
    set((state) => {
      const next = new Set(state.bookmarkedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { bookmarkedIds: next };
    }),
}));
