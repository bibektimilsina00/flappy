"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AudioLines,
  Check,
  Download,
  Folder,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  type Collection,
  createCollection,
  deleteCollection,
  getCollections,
  getLibrary,
  type LibraryAsset,
  updateCollection,
} from "../api";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const GRID = "grid gap-x-5 gap-y-6 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]";

export function AssetsPage() {
  const qc = useQueryClient();
  const { data: library, isLoading } = useQuery({ queryKey: ["assets-library"], queryFn: getLibrary, staleTime: 60_000 });
  const { data: collectionsData } = useQuery({ queryKey: ["collections"], queryFn: getCollections, staleTime: 60_000 });

  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null); // active collection id, null = Uncategorized
  const [renaming, setRenaming] = useState<string | null>(null);
  const [preview, setPreview] = useState<LibraryAsset | null>(null);
  const [type, setType] = useState<"all" | "image" | "video" | "audio">("all");
  const [source, setSource] = useState<"all" | "uploaded" | "generated">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const assets = useMemo(() => library ?? [], [library]);
  const collections = useMemo(() => collectionsData ?? [], [collectionsData]);
  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const assetsOf = (c: Collection) => c.asset_ids.map((id) => byId.get(id)).filter((a): a is LibraryAsset => Boolean(a));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["collections"] });
    qc.invalidateQueries({ queryKey: ["assets-library"] });
  };
  const create = useMutation({ mutationFn: createCollection, onSuccess: (c) => { invalidate(); setRenaming(c.id); } });
  const rename = useMutation({ mutationFn: (v: { id: string; name: string }) => updateCollection(v.id, { name: v.name }), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteCollection, onSuccess: invalidate });
  const assign = useMutation({ mutationFn: (v: { id: string; add?: string[]; remove?: string[] }) => updateCollection(v.id, { add: v.add, remove: v.remove }), onSuccess: invalidate });

  const categorized = useMemo(() => new Set(collections.flatMap((c) => c.asset_ids)), [collections]);
  const activeCollection = collections.find((c) => c.id === active) ?? null;
  const view = activeCollection ? assetsOf(activeCollection) : assets.filter((a) => !categorized.has(a.id));
  const q = query.trim().toLowerCase();
  const shown = view
    .filter(
      (a) =>
        (type === "all" || a.kind === type) &&
        (source === "all" || a.source === source) &&
        (!q || a.name.toLowerCase().includes(q)),
    )
    .sort((a, b) => (sort === "newest" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at)));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 sm:px-10">
        <div className="mb-9 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Assets</h1>
          <div className="flex items-center gap-2">
            <FilterMenu type={type} setType={setType} source={source} setSource={setSource} sort={sort} setSort={setSort} />
            <div className="relative w-56 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search assets…"
                className="w-full rounded-lg border border-border bg-secondary/40 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-muted-foreground/40"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-32 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Folders */}
            <section className="mb-10">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Folders</h2>
              <div className={GRID}>
                {collections.map((c) => (
                  <CollectionCard
                    key={c.id}
                    collection={c}
                    thumbs={assetsOf(c).slice(0, 4)}
                    active={active === c.id}
                    renaming={renaming === c.id}
                    onOpen={() => setActive((cur) => (cur === c.id ? null : c.id))}
                    onRenameStart={() => setRenaming(c.id)}
                    onRenameCommit={(name) => {
                      if (name.trim() && name.trim() !== c.name) rename.mutate({ id: c.id, name: name.trim() });
                      setRenaming(null);
                    }}
                    onDelete={() => {
                      if (window.confirm(`Delete "${c.name}"? Assets stay in your library.`)) {
                        if (active === c.id) setActive(null);
                        remove.mutate(c.id);
                      }
                    }}
                    onDropAsset={(assetId) => assign.mutate({ id: c.id, add: [assetId] })}
                  />
                ))}
                <div>
                  <button
                    type="button"
                    onClick={() => create.mutate("New collection")}
                    disabled={create.isPending}
                    className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-secondary/30 disabled:opacity-50"
                  >
                    {create.isPending ? <Loader2 className="size-6 animate-spin" /> : <Plus className="size-7" />}
                  </button>
                  <p className="mt-2 text-sm text-muted-foreground">New collection</p>
                </div>
              </div>
            </section>

            {/* Items */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                {activeCollection ? (
                  <>
                    <button type="button" onClick={() => setActive(null)} className="text-muted-foreground hover:text-foreground">
                      Uncategorized
                    </button>
                    <span className="text-muted-foreground">/</span>
                    <span>{activeCollection.name}</span>
                  </>
                ) : (
                  "Uncategorized"
                )}
                <span className="text-muted-foreground">{shown.length}</span>
              </h2>

              {shown.length === 0 ? (
                <p className="py-16 text-sm text-muted-foreground">
                  {q ? "No assets match your search." : activeCollection ? "This collection is empty." : "No assets yet."}
                </p>
              ) : (
                <div className={GRID}>
                  {shown.map((a) => (
                    <AssetCard
                      key={a.id}
                      asset={a}
                      collections={collections}
                      inCollection={activeCollection}
                      onOpen={() => setPreview(a)}
                      onAdd={(cid) => assign.mutate({ id: cid, add: [a.id] })}
                      onRemove={(cid) => assign.mutate({ id: cid, remove: [a.id] })}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {preview ? <Lightbox asset={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

// ── collection folder card ──────────────────────────────────
function CollectionCard({
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

// ── asset card ──────────────────────────────────────────────
function AssetCard({
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
        <Thumb asset={asset} hoverPlay />
      </button>
      <div className="mt-2 flex items-center justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={asset.name}>
            {asset.name}
          </p>
          <p className="text-xs text-muted-foreground">{fmtDate(asset.created_at)}</p>
        </div>
        <Menu>
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
                <MenuItem icon={X} onClick={() => { close(); onRemove(inCollection.id); }}>
                  Remove from folder
                </MenuItem>
              ) : null}
              {collections.length ? (
                <>
                  <div className="my-1 border-t border-border" />
                  <p className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Add to</p>
                  {collections.map((c) => {
                    const has = c.asset_ids.includes(asset.id);
                    return (
                      <MenuItem
                        key={c.id}
                        icon={has ? Check : FolderPlus}
                        onClick={() => { close(); has ? onRemove(c.id) : onAdd(c.id); }}
                      >
                        <span className="truncate">{c.name}</span>
                      </MenuItem>
                    );
                  })}
                </>
              ) : null}
            </>
          )}
        </Menu>
      </div>
    </div>
  );
}

function Thumb({ asset, hoverPlay }: { asset: LibraryAsset; hoverPlay?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  if (asset.kind === "image") {
    return <img src={asset.url} loading="lazy" alt="" className="size-full object-cover" />;
  }
  if (asset.kind === "video") {
    return (
      // biome-ignore lint/a11y/useMediaCaption: gallery thumbnail
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

// ── reusable dropdown menu ──────────────────────────────────
function Menu({ children }: { children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
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

// ── filter / sort control ───────────────────────────────────
function FilterMenu({
  type,
  setType,
  source,
  setSource,
  sort,
  setSort,
}: {
  type: string;
  setType: (v: "all" | "image" | "video" | "audio") => void;
  source: string;
  setSource: (v: "all" | "uploaded" | "generated") => void;
  sort: string;
  setSort: (v: "newest" | "oldest") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dirty = type !== "all" || source !== "all" || sort !== "newest";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
          open || dirty ? "border-muted-foreground/40 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        <SlidersHorizontal className="size-4" />
        Filter
        {dirty ? <span className="size-1.5 rounded-full" style={{ backgroundColor: "#14b8a6" }} /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-border bg-secondary p-2 shadow-xl">
          <FilterGroup label="Type" value={type} onChange={(v) => setType(v as "all" | "image" | "video" | "audio")} options={[["all", "All"], ["image", "Images"], ["video", "Videos"], ["audio", "Audio"]]} />
          <FilterGroup label="Source" value={source} onChange={(v) => setSource(v as "all" | "uploaded" | "generated")} options={[["all", "All"], ["uploaded", "Uploaded"], ["generated", "Generated"]]} />
          <FilterGroup label="Sort" value={sort} onChange={(v) => setSort(v as "newest" | "oldest")} options={[["newest", "Newest first"], ["oldest", "Oldest first"]]} />
        </div>
      ) : null}
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">{label}</p>
      {options.map(([val, lbl]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <span className={cn(value === val && "text-foreground")}>{lbl}</span>
          {value === val ? <Check className="size-3.5" style={{ color: "#14b8a6" }} /> : null}
        </button>
      ))}
    </div>
  );
}

function RenameInput({ initial, onCommit }: { initial: string; onCommit: (v: string) => void }) {
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
      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
    />
  );
}

// ── lightbox ────────────────────────────────────────────────
function Lightbox({ asset, onClose }: { asset: LibraryAsset; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via keydown listener
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: inner container only stops propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: inner container only stops propagation */}
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-full max-w-5xl flex-col items-center gap-4">
        {asset.kind === "image" ? (
          <img src={asset.url} alt={asset.name} className="max-h-[78vh] rounded-lg object-contain" />
        ) : asset.kind === "video" ? (
          // biome-ignore lint/a11y/useMediaCaption: user media preview
          <video src={asset.url} controls autoPlay className="max-h-[78vh] rounded-lg" />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-10">
            <AudioLines className="size-12 text-white/70" />
            {/* biome-ignore lint/a11y/useMediaCaption: user media preview */}
            <audio src={asset.url} controls autoPlay />
          </div>
        )}
        <div className="flex items-center gap-3 text-white">
          <span className="max-w-xs truncate text-sm">{asset.name}</span>
          <a
            href={asset.url}
            download
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
          >
            <Download className="size-4" /> Download
          </a>
        </div>
      </div>
    </div>
  );
}
