"use client";

import { create } from "zustand";

interface AccountState {
  activeTab: string;
  isEditingName: boolean;
  isCreatingWorkspace: boolean;
  draftPreferences: Record<string, string> | null;

  setActiveTab: (tab: string) => void;
  setIsEditingName: (editing: boolean) => void;
  setIsCreatingWorkspace: (creating: boolean) => void;
  setDraftPreferences: (prefs: Record<string, string> | null) => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  activeTab: "account",
  isEditingName: false,
  isCreatingWorkspace: false,
  draftPreferences: null,

  setActiveTab: (activeTab) => set({ activeTab }),
  setIsEditingName: (isEditingName) => set({ isEditingName }),
  setIsCreatingWorkspace: (isCreatingWorkspace) => set({ isCreatingWorkspace }),
  setDraftPreferences: (draftPreferences) => set({ draftPreferences }),
}));
