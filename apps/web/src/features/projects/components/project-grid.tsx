import type { Workflow } from "../types";
import { NewProjectTile } from "./new-project-tile";
import { ProjectTile } from "./project-tile";

interface ProjectGridProps {
  workflows: Workflow[];
  onCreate: () => void;
  creating: boolean;
  onRename: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
}

export function ProjectGrid({ workflows, onCreate, creating, onRename, onDelete }: ProjectGridProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      <NewProjectTile onClick={onCreate} pending={creating} />
      {workflows.map((workflow) => (
        <ProjectTile
          key={workflow.id}
          workflow={workflow}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
