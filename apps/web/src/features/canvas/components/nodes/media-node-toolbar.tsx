import { ArrowLeftRight, Circle, Copy, Lock, LockOpen, type LucideIcon, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCanvasActions } from "../canvas-actions";

interface MediaNodeToolbarProps {
  id: string;
  locked: boolean;
}

export function MediaNodeToolbar({ id, locked }: MediaNodeToolbarProps) {
  const { duplicateNode, removeNode, toggleLock } = useCanvasActions();

  return (
    <div className="pointer-events-auto absolute -top-8 right-0 z-30 flex items-center gap-0.5 rounded-full border border-border/80 bg-background/90 p-1 text-muted-foreground opacity-0 shadow-lg backdrop-blur transition-all duration-150 group-hover:opacity-100">
      <Btn icon={locked ? LockOpen : Lock} label={locked ? "Unlock" : "Lock"} onClick={() => toggleLock(id)} />
      <Btn icon={Copy} label="Duplicate" onClick={() => duplicateNode(id)} />
      <Btn icon={Trash2} label="Delete" destructive onClick={() => removeNode(id)} />
    </div>
  );
}

function Btn({
  icon: Icon,
  label,
  destructive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-6 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground",
        destructive && "hover:text-destructive",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
