"use client";

import { AudioLines, Check, Download, FolderPlus, MoreHorizontal, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Collection, LibraryAsset } from "../types";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AssetCard({
  asset,
  collections,
  inCollection,
  onOpen,
  onAdd,
  onRemove,
}: {
  asset: LibraryAsset;
  collections: Collection[];
  inCollection: Collection | null;
  onOpen: () => void;
  onAdd: (collectionId: string) => void;
  onRemove: (collectionId: string) => void;
}) {
  return (
    <div
      className="group"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("asset-id", asset.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block aspect-square w-full cursor-grab overflow-hidden rounded-2xl border border-border bg-secondary/30 transition-colors group-hover:border-muted-foreground/30 active:cursor-grabbing"
      >
        <AssetThumb asset={asset} hoverPlay />
      </button>
      <div className="mt-2 flex items-center justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={asset.name}>
            {asset.name}
          </p>
          <p className="text-xs text-muted-foreground">{fmtDate(asset.created_at)}</p>
        </div>
        <AssetMenu>
          {(close) => (
            <>
              <a
                href={asset.url}
                download
                onClick={close}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Download className="size-4 shrink-0" /> Download
              </a>
              {inCollection ? (
                <AssetMenuItem icon={X} onClick={() => { close(); onRemove(inCollection.id); }}>
                  Remove from folder
                </AssetMenuItem>
              ) : null}
              {collections.length ? (
                <>
                  <div className="my-1 border-t border-border" />
                  <p className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Add to</p>
                  {collections.map((c) => {
                    const has = c.asset_ids.includes(asset.id);
                    return (
                      <AssetMenuItem
                        key={c.id}
                        icon={has ? Check : FolderPlus}
                        onClick={() => { close(); has ? onRemove(c.id) : onAdd(c.id); }}
                      >
                        <span className="truncate">{c.name}</span>
                      </AssetMenuItem>
                    );
                  })}
                </>
              ) : null}
            </>
          )}
        </AssetMenu>
      </div>
    </div>
  );
}

function AssetThumb({ asset, hoverPlay }: { asset: LibraryAsset; hoverPlay?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  if (asset.kind === "image") {
    return <img src={asset.url} loading="lazy" alt="" className="size-full object-cover" />;
  }
  if (asset.kind === "video") {
    return (
      // biome-ignore lint/a11y/useMediaCaption: thumbnail
      <video
        ref={ref}
        src={`${asset.url}#t=0.1`}
        muted
        loop
        playsInline
        preload="metadata"
        onMouseEnter={hoverPlay ? () => ref.current?.play().catch(() => {}) : undefined}
        onMouseLeave={hoverPlay ? () => { const v = ref.current; if (v) { v.pause(); v.currentTime = 0.1; } } : undefined}
        className="size-full object-cover"
      />
    );
  }
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-secondary to-muted text-muted-foreground">
      <AudioLines className="size-6" />
    </div>
  );
}

function AssetMenu({ children }: { children: (close: () => void) => React.ReactNode }) {
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
        <div className="absolute right-0 top-full z-30 mt-1 max-h-72 w-48 overflow-y-auto rounded-lg border border-border bg-secondary p-1 shadow-xl">
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function AssetMenuItem({
  icon: Icon,
  children,
  onClick,
}: {
  icon: typeof Pencil;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
}
