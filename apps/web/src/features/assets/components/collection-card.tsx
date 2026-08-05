"use client";

import { Folder, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Collection, LibraryAsset } from "../types";
import { RenameInput } from "./rename-input";

export function CollectionCard({
  collection,
  thumbs,
  active,
  renaming,
  onOpen,
  onRenameStart,
  onRenameCommit,
  onDelete,
  onDropAsset,
}: {
  collection: Collection;
  thumbs: LibraryAsset[];
  active: boolean;
  renaming: boolean;
  onOpen: () => void;
  onRenameStart: () => void;
  onRenameCommit: (name: string) => void;
  onDelete: () => void;
  onDropAsset: (assetId: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div className="group">
      <button
        type="button"
        onClick={onOpen}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const id = e.dataTransfer.getData("asset-id");
          if (id) onDropAsset(id);
        }}
        className={cn(
          "grid aspect-square w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl border bg-secondary/30 p-0.5 transition-colors",
          over ? "border-2 border-[#14b8a6]" : active ? "border-foreground/40" : "border-border hover:border-muted-foreground/30",
        )}
      >
        {thumbs.length === 0 ? (
          <div className="col-span-2 row-span-2 grid place-items-center text-muted-foreground/50">
            <Folder className="size-8" />
          </div>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={thumbs[i]?.id ?? `e${i}`} className="overflow-hidden rounded-md bg-muted/40">
              {thumbs[i] ? <Thumb asset={thumbs[i]} /> : null}
            </div>
          ))
        )}
      </button>
      <div className="mt-2 flex items-center justify-between gap-1">
        {renaming ? (
          <RenameInput initial={collection.name} onCommit={onRenameCommit} />
        ) : (
          <p className="min-w-0 truncate text-sm font-medium">
            {collection.name} <span className="text-muted-foreground">{collection.asset_ids.length}</span>
          </p>
        )}
        <Menu>
          {(close) => (
            <>
              <MenuItem icon={Pencil} onClick={() => { close(); onRenameStart(); }}>Rename</MenuItem>
              <MenuItem icon={Trash2} destructive onClick={() => { close(); onDelete(); }}>Delete</MenuItem>
            </>
          )}
        </Menu>
      </div>
    </div>
  );
}

function Thumb({ asset }: { asset: LibraryAsset }) {
  const ref = useRef<HTMLVideoElement>(null);
  if (asset.kind === "image") {
    return <img src={asset.url} loading="lazy" alt="" className="size-full object-cover" />;
  }
  if (asset.kind === "video") {
    return (
      // biome-ignore lint/a11y/useMediaCaption: thumbnail
      <video ref={ref} src={`${asset.url}#t=0.1`} muted loop playsInline preload="metadata" className="size-full object-cover" />
    );
  }
  return <div className="size-full bg-secondary/50" />;
}

function Menu({ children }: { children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative shrink-0", open && "z-30")}>
      <button
        type="button"
        aria-label="Options"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          open ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-border bg-secondary p-1 shadow-xl">
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  destructive,
}: {
  icon: typeof Pencil;
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent",
        destructive ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
}
