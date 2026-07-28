"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ProjectGrid } from "../components/project-grid";
import { ProjectList } from "../components/project-list";
import { ProjectsHeader } from "../components/projects-header";
import { useProjectActions } from "../hooks/use-project-actions";
import { useProjects } from "../hooks/use-projects";
import type { ProjectView } from "../types";

export function ProjectsPage() {
  const { data: workflows, isLoading } = useProjects();
  const { create } = useProjectActions();
  const [view, setView] = useState<ProjectView>("grid");

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-6">
      <ProjectsHeader view={view} onViewChange={setView} />

      {isLoading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : view === "grid" ? (
        <ProjectGrid workflows={workflows ?? []} onCreate={() => create.mutate()} creating={create.isPending} />
      ) : (
        <ProjectList workflows={workflows ?? []} />
      )}
    </div>
  );
}
