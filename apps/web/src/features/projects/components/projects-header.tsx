import type { ProjectView } from "../types";
import { ProjectsViewToggle } from "./projects-view-toggle";

interface ProjectsHeaderProps {
  view: ProjectView;
  onViewChange: (view: ProjectView) => void;
}

export function ProjectsHeader({ view, onViewChange }: ProjectsHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between border-b border-border pb-5">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <ProjectsViewToggle view={view} onChange={onViewChange} />
    </div>
  );
}
