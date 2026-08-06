"use client";

import { Plus } from "lucide-react";

export function EmptyDropzone({ onImport }: { onImport: () => void }) {
  return (
    <button
      type="button"
      onClick={onImport}
      className="flex w-full items-center justify-center gap-2 bg-white/[0.02] py-8 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
    >
      <Plus className="size-4" /> Add media to this project
    </button>
  );
}
