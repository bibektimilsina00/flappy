import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProjectView } from "../types";

interface ProjectsViewToggleProps {
  view: ProjectView;
  onChange: (view: ProjectView) => void;
}

export function ProjectsViewToggle({ view, onChange }: ProjectsViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      <ToggleButton active={view === "grid"} label="Grid view" onClick={() => onChange("grid")}>
        <LayoutGrid className="size-4" />
      </ToggleButton>
      <ToggleButton active={view === "list"} label="List view" onClick={() => onChange("list")}>
        <List className="size-4" />
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground",
        active && "bg-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}
