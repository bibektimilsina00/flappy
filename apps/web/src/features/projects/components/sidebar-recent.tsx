"use client";

import { MonitorPlay, Plus } from "lucide-react";
import Link from "next/link";
import { NavSection } from "@/shared/components/app-sidebar/nav-section";
import { useProjectActions } from "../hooks/use-project-actions";
import { useRecentProjects } from "../hooks/use-recent-projects";

export function SidebarRecent() {
  const { projects } = useRecentProjects();
  const { create } = useProjectActions();

  return (
    <NavSection
      title="Recent"
      action={
        <button
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
        projects.map((workflow) => (
          <Link
            key={workflow.id}
            href={`/editor?project=${workflow.id}`}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <MonitorPlay className="size-4" />
            </span>
            <span className="truncate">{workflow.name}</span>
          </Link>
        ))
      )}
    </NavSection>
  );
}
