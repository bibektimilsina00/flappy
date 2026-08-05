"use client";

import { create } from "zustand";

interface AuthUIState {
  mode: "login" | "register";
  email: string;
  password: string;
  name: string;
  formError: string | null;

  setMode: (mode: "login" | "register") => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setName: (name: string) => void;
  setFormError: (error: string | null) => void;
  resetForm: () => void;
}

export const useAuthStore = create<AuthUIState>((set) => ({
  mode: "login",
  email: "",
  password: "",
  name: "",
  formError: null,

  setMode: (mode) => set({ mode, formError: null }),
  setEmail: (email) => set({ email, formError: null }),
  setPassword: (password) => set({ password, formError: null }),
  setName: (name) => set({ name, formError: null }),
  setFormError: (formError) => set({ formError }),
  resetForm: () => set({ email: "", password: "", name: "", formError: null }),
}));
