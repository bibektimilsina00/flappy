"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useProjectActions } from "../hooks/use-project-actions";
import { useRecentProjects } from "../hooks/use-recent-projects";
import { NewProjectCard } from "./new-project-card";
import { ProjectCard } from "./project-card";

// Dashboard gallery. Self-contained: wires its own data + create action.
export function RecentProjects() {
  const { projects } = useRecentProjects();
  const { create } = useProjectActions();

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent projects</h2>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          All projects
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <NewProjectCard onClick={() => create.mutate()} pending={create.isPending} />
        {projects.map((workflow) => (
          <ProjectCard key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </section>
  );
}
