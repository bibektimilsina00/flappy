"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useAssets } from "../hooks/use-assets";
import { AssetThumb } from "./asset-thumb";

const TABS = ["Mine", "Unsplash", "Movie Library"] as const;

export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Mine");
  const { data, isLoading } = useAssets(true);
  const assets = (data ?? []).filter((a) => a.kind !== "text");

  return (
    <div className="fixed left-[80px] top-1/2 z-40 flex h-[68vh] w-[min(560px,52vw)] -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <div className="flex items-center gap-5">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "relative pb-2 text-[13px] transition-colors",
                tab === t ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
              {tab === t ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" /> : null}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <input
            placeholder="Filter by name"
            className="w-44 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab !== "Mine" ? (
          <div className="grid h-full place-items-center text-[13px] text-muted-foreground">
            {tab} — coming soon
          </div>
        ) : (
          <>
            <h3 className="text-[13px] font-semibold">Assets</h3>

            <p className="mt-4 text-[13px] text-muted-foreground">Folders</p>
            <div className="mt-2 w-28">
              <button
                type="button"
                className="grid aspect-square w-full place-items-center rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:bg-accent/40"
              >
                <Plus className="size-5" />
              </button>
              <p className="mt-1.5 text-xs text-muted-foreground">New collection</p>
            </div>

            <p className="mt-6 text-[11px] tracking-wide text-muted-foreground">UNCATEGORIZED</p>
            {isLoading ? (
              <div className="mt-5 flex justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : assets.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted-foreground">No assets yet.</p>
            ) : (
              <div className="mt-3 grid grid-cols-4 gap-3 lg:grid-cols-5">
                {assets.map((a) => (
                  <div key={a.id} className="overflow-hidden rounded-lg">
                    <AssetThumb asset={a} className="aspect-square w-full rounded-lg object-cover" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
