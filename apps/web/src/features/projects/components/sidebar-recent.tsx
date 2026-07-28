"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { NavSection } from "@/shared/components/app-sidebar/nav-section";
import { useProjectActions } from "../hooks/use-project-actions";
import { useRecentProjects } from "../hooks/use-recent-projects";
import type { Workflow } from "../types";
import { ProjectOptionsMenu, RenameInput } from "./project-options-menu";
import { ProjectThumb } from "./project-thumb";

export function SidebarRecent() {
  const { projects } = useRecentProjects();
  const { create } = useProjectActions();

  return (
    <NavSection
      title="Recent"
      action={
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label="New project"
        >
          <Plus className="size-4" />
        </button>
      }
    >
      {projects.length === 0 ? (
        <p className="px-3 py-1 text-sm text-muted-foreground/60">No projects yet</p>
      ) : (
        projects.map((workflow) => <SidebarRecentItem key={workflow.id} workflow={workflow} />)
      )}
    </NavSection>
  );
}

function SidebarRecentItem({ workflow }: { workflow: Workflow }) {
  const { rename, remove } = useProjectActions();
  const [editing, setEditing] = useState(false);

  const commit = (value: string) => {
    const name = value.trim();
    if (name && name !== workflow.name) rename.mutate({ id: workflow.id, name });
    setEditing(false);
  };

  const rowClass = "flex items-center gap-3 rounded-md px-3 py-2 pr-8 text-sm text-muted-foreground";
  const thumb = (
    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground">
      <ProjectThumb src={workflow.thumbnail} iconClassName="size-4" />
    </span>
  );

  return (
    <div className="group relative">
      {editing ? (
        <div className={rowClass}>
          {thumb}
          <div className="min-w-0 flex-1">
            <RenameInput initial={workflow.name} onCommit={commit} />
          </div>
        </div>
      ) : (
        <Link href={`/canvas?project=${workflow.id}`} className={cn(rowClass, "transition-colors hover:bg-accent hover:text-foreground")}>
          {thumb}
          <span className="truncate">{workflow.name}</span>
        </Link>
      )}
      <ProjectOptionsMenu
        className="absolute right-1.5 top-1/2 -translate-y-1/2"
        onRename={() => setEditing(true)}
        onDelete={() => {
          if (window.confirm(`Delete "${workflow.name}"?`)) remove.mutate(workflow.id);
        }}
      />
    </div>
  );
}
