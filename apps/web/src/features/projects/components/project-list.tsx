"use client";

import Link from "next/link";
import { useState } from "react";
import { useProjectActions } from "../hooks/use-project-actions";
import { formatUpdated } from "../lib/display";
import type { Workflow } from "../types";
import { ProjectOptionsMenu, RenameInput } from "./project-options-menu";
import { ProjectThumb } from "./project-thumb";

export function ProjectList({ workflows }: { workflows: Workflow[] }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {workflows.map((workflow) => (
        <ProjectListItem key={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
}

function ProjectListItem({ workflow }: { workflow: Workflow }) {
  const { rename, remove } = useProjectActions();
  const [editing, setEditing] = useState(false);

  const commit = (value: string) => {
    const name = value.trim();
    if (name && name !== workflow.name) rename.mutate({ id: workflow.id, name });
    setEditing(false);
  };

  return (
    <div className="group flex items-center gap-4 px-4 py-3">
      <Link
        href={`/canvas?project=${workflow.id}`}
        className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary/60 text-muted-foreground"
      >
        <ProjectThumb src={workflow.thumbnail} iconClassName="size-5" />
      </Link>
      <div className="min-w-0 flex-1">
        {editing ? (
          <RenameInput initial={workflow.name} onCommit={commit} className="max-w-sm px-1.5 py-0.5" />
        ) : (
          <h3 className="truncate text-sm font-semibold">{workflow.name}</h3>
        )}
        <p className="text-xs text-muted-foreground">{formatUpdated(workflow.updated_at)}</p>
      </div>
      <ProjectOptionsMenu
        className="shrink-0"
        onRename={() => setEditing(true)}
        onDelete={() => {
          if (window.confirm(`Delete "${workflow.name}"?`)) remove.mutate(workflow.id);
        }}
      />
    </div>
  );
}
