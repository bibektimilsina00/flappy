"use client";

import { Loader2, Plus, Search } from "lucide-react";
import { AssetCard } from "../components/asset-card";
import { CollectionCard } from "../components/collection-card";
import { FilterMenu } from "../components/filter-menu";
import { Lightbox } from "../components/lightbox";
import { useAssets } from "../hooks/use-assets";

const GRID = "grid gap-x-5 gap-y-6 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]";

export function AssetsPage() {
  const {
    isLoading,
    collections,
    shownAssets,
    activeCollection,
    query,
    setQuery,
    activeCollectionId,
    setActiveCollectionId,
    renamingCollectionId,
    setRenamingCollectionId,
    previewAsset,
    setPreviewAsset,
    typeFilter,
    setTypeFilter,
    sourceFilter,
    setSourceFilter,
    sortOrder,
    setSortOrder,
    assetsOf,
    createCollection,
    isCreatingCollection,
    renameCollection,
    deleteCollection,
    assignCollection,
  } = useAssets();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 sm:px-10">
        <div className="mb-9 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Assets</h1>
          <div className="flex items-center gap-2">
            <FilterMenu
              type={typeFilter}
              setType={setTypeFilter}
              source={sourceFilter}
              setSource={setSourceFilter}
              sort={sortOrder}
              setSort={setSortOrder}
            />
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
                    active={activeCollectionId === c.id}
                    renaming={renamingCollectionId === c.id}
                    onOpen={() => setActiveCollectionId((cur) => (cur === c.id ? null : c.id))}
                    onRenameStart={() => setRenamingCollectionId(c.id)}
                    onRenameCommit={(name) => {
                      if (name.trim() && name.trim() !== c.name) renameCollection({ id: c.id, name: name.trim() });
                      setRenamingCollectionId(null);
                    }}
                    onDelete={() => {
                      if (window.confirm(`Delete "${c.name}"? Assets stay in your library.`)) {
                        if (activeCollectionId === c.id) setActiveCollectionId(null);
                        deleteCollection(c.id);
                      }
                    }}
                    onDropAsset={(assetId) => assignCollection({ id: c.id, add: [assetId] })}
                  />
                ))}
                <div>
                  <button
                    type="button"
                    onClick={() => createCollection("New collection")}
                    disabled={isCreatingCollection}
                    className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-secondary/30 disabled:opacity-50"
                  >
                    {isCreatingCollection ? <Loader2 className="size-6 animate-spin" /> : <Plus className="size-7" />}
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
                    <button
                      type="button"
                      onClick={() => setActiveCollectionId(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Uncategorized
                    </button>
                    <span className="text-muted-foreground">/</span>
                    <span>{activeCollection.name}</span>
                  </>
                ) : (
                  "Uncategorized"
                )}
                <span className="text-muted-foreground">{shownAssets.length}</span>
              </h2>

              {shownAssets.length === 0 ? (
                <p className="py-16 text-sm text-muted-foreground">
                  {query ? "No assets match your search." : activeCollection ? "This collection is empty." : "No assets yet."}
                </p>
              ) : (
                <div className={GRID}>
                  {shownAssets.map((a) => (
                    <AssetCard
                      key={a.id}
                      asset={a}
                      collections={collections}
                      inCollection={activeCollection}
                      onOpen={() => setPreviewAsset(a)}
                      onAdd={(cid) => assignCollection({ id: cid, add: [a.id] })}
                      onRemove={(cid) => assignCollection({ id: cid, remove: [a.id] })}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {previewAsset ? <Lightbox asset={previewAsset} onClose={() => setPreviewAsset(null)} /> : null}
    </div>
  );
}
