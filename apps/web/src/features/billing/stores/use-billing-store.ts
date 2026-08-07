"use client";

import { create } from "zustand";
import type { BillingPeriod } from "../types";

interface BillingUIState {
  selectedTier: string | null;
  studioSizeIndex: number;
  period: BillingPeriod;
  // The upgrade popup — openable from anywhere we need to prompt for credits.
  upgradeOpen: boolean;
  upgradeReason: string | null;

  setSelectedTier: (tier: string | null) => void;
  setStudioSizeIndex: (idx: number) => void;
  setPeriod: (period: BillingPeriod) => void;
  openUpgrade: (reason?: string) => void;
  closeUpgrade: () => void;
}

export const useBillingStore = create<BillingUIState>((set) => ({
  selectedTier: null,
  studioSizeIndex: 0,
  period: "yearly",
  upgradeOpen: false,
  upgradeReason: null,

  setSelectedTier: (selectedTier) => set({ selectedTier }),
  setStudioSizeIndex: (studioSizeIndex) => set({ studioSizeIndex }),
  setPeriod: (period) => set({ period }),
  openUpgrade: (reason) => set({ upgradeOpen: true, upgradeReason: reason ?? null }),
  closeUpgrade: () => set({ upgradeOpen: false }),
}));

// Fire the upgrade popup from non-React code (event handlers, services).
export const openUpgrade = (reason?: string) =>
  useBillingStore.getState().openUpgrade(reason);
