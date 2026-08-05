"use client";

import { Copy, Scissors, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";

export function ClipContextMenu({
  x,
  y,
  onClose,
  onDuplicate,
  onSplit,
  onDelete,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onDuplicate: () => void;
  onSplit: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const item = (label: string, Icon: typeof Copy, onClick: () => void, danger?: boolean) => (
    <button
      type="button"
      onClick={() => {
        onClick();
        onClose();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent",
        danger ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" /> {label}
    </button>
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stop the outside-close mousedown inside the menu
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled globally
    <div
      className="fixed z-50 w-40 rounded-lg border border-border bg-secondary p-1 shadow-xl"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {item("Duplicate", Copy, onDuplicate)}
      {item("Split at playhead", Scissors, onSplit)}
      {item("Delete", Trash2, onDelete, true)}
    </div>
  );
}
