"use client";

import type { LucideIcon } from "lucide-react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Hover ⋯ button + dropdown (Rename / Delete). Place inside a `group` container; it
// reveals on hover. `onRename` should flip the caller into inline-edit mode.
export function ProjectOptionsMenu({
  onRename,
  onDelete,
  className,
}: {
  onRename: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on any outside click and on Escape. A `position:fixed` overlay can't be used
  // here — an ancestor's transform (the sidebar row's -translate-y-1/2) would trap it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    // `z-50` while open lifts this above sibling rows (whose translate/stacking would
    // otherwise paint over the menu and make it look see-through).
    <div ref={ref} className={cn("relative", open && "z-50", className)}>
      <button
        type="button"
        aria-label="Project options"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "grid place-items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          open ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-border bg-secondary p-1 shadow-xl">
            <ProjectMenuItem
              icon={Pencil}
              onClick={() => {
                setOpen(false);
                onRename();
              }}
            >
              Rename
            </ProjectMenuItem>
            <ProjectMenuItem
              icon={Trash2}
              destructive
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Delete
            </ProjectMenuItem>
          </div>
      ) : null}
    </div>
  );
}

// Inline rename field: Enter/blur commits, Escape cancels (re-emits the original).
export function RenameInput({
  initial,
  onCommit,
  className,
}: {
  initial: string;
  onCommit: (value: string) => void;
  className?: string;
}) {
  return (
    <input
      // biome-ignore lint/a11y/noAutofocus: inline rename should focus immediately
      autoFocus
      defaultValue={initial}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit(e.currentTarget.value);
        else if (e.key === "Escape") onCommit(initial);
      }}
      className={cn("w-full bg-transparent text-sm font-semibold text-foreground outline-none", className)}
    />
  );
}

function ProjectMenuItem({
  icon: Icon,
  children,
  onClick,
  destructive,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent",
        destructive ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
}
