import { ChevronDown, PanelLeft } from "lucide-react";

interface WorkspaceSwitcherProps {
  name: string;
  initial: string;
}

export function WorkspaceSwitcher({ name, initial }: WorkspaceSwitcherProps) {
  return (
    <div className="flex items-center justify-between px-2 py-3">
      <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
        <span className="flex size-6 items-center justify-center rounded-md bg-blue-500 text-xs font-semibold text-white">
          {initial}
        </span>
        <span className="text-sm font-medium">{name}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>
      <button
        aria-label="Toggle sidebar"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <PanelLeft className="size-4" />
      </button>
    </div>
  );
}
