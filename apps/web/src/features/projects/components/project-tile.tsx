"use client";

import Link from "next/link";
import { useState } from "react";
import { useProjectActions } from "../hooks/use-project-actions";
import { formatUpdated } from "../lib/display";
import type { Workflow } from "../types";
import { ProjectOptionsMenu, RenameInput } from "./project-options-menu";
import { ProjectThumb } from "./project-thumb";

export function ProjectTile({ workflow }: { workflow: Workflow }) {
  const { rename, remove } = useProjectActions();
  const [editing, setEditing] = useState(false);

  const commit = (value: string) => {
    const name = value.trim();
    if (name && name !== workflow.name) rename.mutate({ id: workflow.id, name });
    setEditing(false);
  };

  return (
    <div className="group">
      <Link
        href={`/canvas?project=${workflow.id}`}
        className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/40 transition-colors hover:border-muted-foreground/30"
      >
        <ProjectThumb src={workflow.thumbnail} iconClassName="size-8 text-muted-foreground/50" />
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <RenameInput initial={workflow.name} onCommit={commit} className="px-1.5 py-0.5" />
          ) : (
            <h3 className="truncate text-sm font-semibold">{workflow.name}</h3>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">{formatUpdated(workflow.updated_at)}</p>
        </div>
        <ProjectOptionsMenu
          className="shrink-0"
          onRename={() => setEditing(true)}
          onDelete={() => {
            if (window.confirm(`Delete "${workflow.name}"?`)) remove.mutate(workflow.id);
          }}
        />
      </div>
    </div>
  );
}
