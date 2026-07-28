import { ArrowLeftRight, Circle, Copy, Lock, LockOpen, type LucideIcon, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCanvasActions } from "../canvas-actions";

interface MediaNodeToolbarProps {
  id: string;
  locked: boolean;
}

// Lives inside the node DOM (not a NodeToolbar portal) so it scales with zoom.
// Sits just above the node's top-right; visible on hover only.
export function MediaNodeToolbar({ id, locked }: MediaNodeToolbarProps) {
  const { duplicateNode, removeNode, toggleLock } = useCanvasActions();

  return (
    <div className="nodrag nopan absolute bottom-full right-2 mb-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#292929] p-1 opacity-0 shadow-xl transition-opacity pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100">
      <ToolButton icon={Play} title="Run" onClick={() => {}} />
      <ToolButton icon={Circle} title="Preview" onClick={() => {}} />
      <ToolButton
        icon={locked ? Lock : LockOpen}
        title={locked ? "Unlock" : "Lock"}
        active={locked}
        onClick={() => toggleLock(id)}
      />
      <ToolButton icon={Copy} title="Duplicate" onClick={() => duplicateNode(id)} />
      <ToolButton icon={ArrowLeftRight} title="Swap direction" onClick={() => {}} />
      <ToolButton icon={Trash2} title="Delete" danger onClick={() => removeNode(id)} />
    </div>
  );
}

interface ToolButtonProps {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}

function ToolButton({ icon: Icon, title, onClick, active, danger }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "grid size-6 place-items-center rounded-md bg-[#505050] text-neutral-200 transition-colors hover:bg-teal-500 hover:text-white",
        active && "bg-[#6b6b6b] text-white",
        danger && "hover:bg-destructive hover:text-white",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
