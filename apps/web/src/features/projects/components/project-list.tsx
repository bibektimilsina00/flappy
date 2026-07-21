import { MonitorPlay, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatUpdated } from "../lib/display";
import type { Workflow } from "../types";

interface ProjectListProps {
  workflows: Workflow[];
  onRename: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
}

export function ProjectList({ workflows, onRename, onDelete }: ProjectListProps) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {workflows.map((workflow) => (
        <div key={workflow.id} className="group flex items-center gap-4 px-4 py-3">
          <Link
            href={`/editor?project=${workflow.id}`}
            className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary/60 text-muted-foreground"
          >
            <MonitorPlay className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
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
      ))}
    </div>
  );
}
