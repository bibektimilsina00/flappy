"use client";

import { Loader2, X } from "lucide-react";
import { type AssetItem, useAssets } from "../hooks/use-assets";
import { AssetThumb } from "./asset-thumb";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function groupByDay(assets: AssetItem[]): [string, AssetItem[]][] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const groups = new Map<string, AssetItem[]>();
  for (const a of assets) {
    const d = new Date(a.created_at).toDateString();
    const label = d === today ? "TODAY" : d === yesterday ? "YESTERDAY" : d.toUpperCase();
    (groups.get(label) ?? groups.set(label, []).get(label)!).push(a);
  }
  return [...groups.entries()];
}

export function GenerationsPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useAssets(true);
  const assets = (data ?? []).filter((a) => a.kind !== "text");
  const groups = groupByDay(assets);

  return (
    <div className="fixed left-[80px] top-1/2 z-40 flex h-[68vh] w-[min(560px,52vw)] -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3.5">
        <h2 className="text-sm font-semibold">Generations</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{pad(assets.length, 3)}</span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            No generations yet.
          </div>
        ) : (
          groups.map(([label, items]) => (
            <div key={label} className="mb-5">
              <div className="flex items-center gap-3 border-b border-border pb-2 text-[11px] tracking-wide text-muted-foreground">
                <span>{label}</span>
                <span className="flex-1" />
                <span>{pad(items.length)}</span>
              </div>
              <div className="columns-2 gap-3 pt-4 lg:columns-3">
                {items.map((a) => (
                  <div key={a.id} className="mb-3 break-inside-avoid overflow-hidden rounded-lg">
                    <AssetThumb asset={a} className="w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
