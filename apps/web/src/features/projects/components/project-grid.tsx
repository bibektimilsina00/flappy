import type { Workflow } from "../types";
import { NewProjectTile } from "./new-project-tile";
import { ProjectTile } from "./project-tile";

interface ProjectGridProps {
  workflows: Workflow[];
  onCreate: () => void;
  creating: boolean;
}

export function ProjectGrid({ workflows, onCreate, creating }: ProjectGridProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      <NewProjectTile onClick={onCreate} pending={creating} />
      {workflows.map((workflow) => (
        <ProjectTile key={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
}
