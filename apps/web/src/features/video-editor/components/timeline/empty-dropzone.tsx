"use client";

import { Plus } from "lucide-react";

export function EmptyDropzone({ onImport }: { onImport: () => void }) {
  return (
    <div className="p-3">
      <button
        type="button"
        onClick={onImport}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.03] py-7 text-sm font-medium text-muted-foreground transition-all hover:border-teal-400/50 hover:bg-white/[0.06] hover:text-white"
      >
        <Plus className="size-4" /> Add media to this project
      </button>
    </div>
  );
}
