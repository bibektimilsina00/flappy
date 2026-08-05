import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
}

interface SessionState {
  token: string | null;
  user: SessionUser | null;
  setToken: (token: string) => void;
  setAuth: (data: { token: string; user: SessionUser }) => void;
  clear: () => void;
}

// App-wide session: JWT + current user, persisted to localStorage so a reload
// keeps you signed in. Canonical store pattern.
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setAuth: ({ token, user }) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: "session" },
  ),
);
