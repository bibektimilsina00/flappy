import { Loader2, Plus } from "lucide-react";

export function NewProjectCard({ onClick, pending }: { onClick: () => void; pending?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="flex h-40 w-56 shrink-0 flex-col overflow-hidden rounded-xl border border-border p-3 text-left transition-colors hover:border-muted-foreground/40 hover:bg-accent/30 disabled:opacity-60"
    >
      <div className="grid flex-1 place-items-center text-muted-foreground">
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
      </div>
      <h3 className="text-sm font-semibold">New project</h3>
    </button>
  );
}
