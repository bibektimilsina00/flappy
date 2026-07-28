import { ChevronDown, PanelLeft } from "lucide-react";

interface WorkspaceSwitcherProps {
  name: string;
  initial: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function WorkspaceSwitcher({ name, initial, collapsed, onToggle }: WorkspaceSwitcherProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="flex size-8 items-center justify-center rounded-md bg-blue-500 text-xs font-semibold text-white"
        >
          {initial}
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between px-2 py-3">
      <button type="button" className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-500 text-xs font-semibold text-white">
          {initial}
        </span>
        <span className="truncate whitespace-nowrap text-xs font-medium">{name}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle sidebar"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <PanelLeft className="size-4" />
      </button>
    </div>
  );
}
