import { create } from "zustand";
import type { ClipsJob } from "../types";

interface ClipsStore {
  activeJobId: string | null;
  jobs: ClipsJob[];
  setActiveJobId: (id: string | null) => void;
  setJobs: (jobs: ClipsJob[]) => void;
  updateJob: (job: ClipsJob) => void;
}

export const useClipsStore = create<ClipsStore>((set) => ({
  activeJobId: null,
  jobs: [],
  setActiveJobId: (id) => set({ activeJobId: id }),
  setJobs: (jobs) => set({ jobs }),
  updateJob: (job) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === job.id ? job : j)),
    })),
}));
