"use client";

import { create } from "zustand";

interface BillingUIState {
  selectedTier: string | null;
  studioSizeIndex: number;

  setSelectedTier: (tier: string | null) => void;
  setStudioSizeIndex: (idx: number) => void;
}

export const useBillingStore = create<BillingUIState>((set) => ({
  selectedTier: null,
  studioSizeIndex: 0,

  setSelectedTier: (selectedTier) => set({ selectedTier }),
  setStudioSizeIndex: (studioSizeIndex) => set({ studioSizeIndex }),
}));
