import { MonitorPlay, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatUpdated } from "../lib/display";
import type { Workflow } from "../types";

interface ProjectTileProps {
  workflow: Workflow;
  onRename: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
}

export function ProjectTile({ workflow, onRename, onDelete }: ProjectTileProps) {
  return (
    <div className="group">
      <Link
        href={`/editor?project=${workflow.id}`}
        className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/40 transition-colors hover:border-muted-foreground/30"
      >
        <MonitorPlay className="size-8 text-muted-foreground/50" />
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{workflow.name}</h3>
          <p className="text-xs text-muted-foreground">{formatUpdated(workflow.updated_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            aria-label="Rename"
            onClick={() => onRename(workflow)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
          <button
            aria-label="Delete"
            onClick={() => onDelete(workflow)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
