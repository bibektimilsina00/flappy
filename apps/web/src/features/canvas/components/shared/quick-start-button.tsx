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
      className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-foreground/30 hover:bg-accent hover:text-foreground active:scale-95"
    >
      <Icon className="size-4 text-teal-400" />
      <span>{label}</span>
    </button>
  );
}
