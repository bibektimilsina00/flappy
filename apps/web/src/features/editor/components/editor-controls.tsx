"use client";

import {
  ChevronUp,
  Hand,
  type LucideIcon,
  Maximize,
  MousePointer2,
  Redo2,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type CanvasTool = "hand" | "pointer";

interface EditorControlsProps {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFitView: () => void;
}

export function EditorControls({
  tool,
  onToolChange,
  onUndo,
  onRedo,
  onFitView,
}: EditorControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ToolIcon = tool === "hand" ? Hand : MousePointer2;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const pick = (next: CanvasTool) => {
    onToolChange(next);
    setMenuOpen(false);
  };

  return (
    <div ref={ref} className="absolute bottom-4 left-4 z-10">
      {menuOpen ? (
        <div className="mb-2 flex w-36 flex-col gap-1 rounded-xl border border-border bg-popover p-1 shadow-xl">
          <ToolItem icon={Hand} label="Mover" active={tool === "hand"} onClick={() => pick("hand")} />
          <ToolItem
            icon={MousePointer2}
            label="Pointer"
            active={tool === "pointer"}
            onClick={() => pick("pointer")}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-xl">
        <button
          type="button"
          title="Toggle tool"
          onClick={() => onToolChange(tool === "hand" ? "pointer" : "hand")}
          className="grid size-7 place-items-center rounded-md bg-secondary text-foreground transition-colors hover:bg-accent"
        >
          <ToolIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Tool menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="grid size-5 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronUp className="size-3.5" />
        </button>

        <Divider />
        <CtrlButton icon={Undo2} title="Undo" onClick={onUndo} />
        <CtrlButton icon={Redo2} title="Redo" onClick={onRedo} />

        <Divider />
        <CtrlButton icon={Maximize} title="Fit view" onClick={onFitView} />
      </div>
    </div>
  );
}

function Divider() {
  return <div className="mx-0.5 h-4 w-px bg-border" />;
}

function CtrlButton({ icon: Icon, title, onClick }: { icon: LucideIcon; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function ToolItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors",
        active ? "bg-teal-500 text-white" : "text-foreground hover:bg-accent",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
