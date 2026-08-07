import type { LucideIcon } from "lucide-react";

interface QuickStartButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

export function QuickStartButton({ icon: Icon, label, onClick }: QuickStartButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg border border-border bg-card/50 px-4 py-2.5 text-sm font-medium transition-colors hover:border-muted-foreground/30 hover:bg-accent"
    >
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </button>
  );
}
