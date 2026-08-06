"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { searchStock } from "../../services/video-editor-api";

// Live Pexels search for a kind (image|video). Clicking a result imports it via
// onAddStock. Degrades quietly when the backend has no Pexels key (501).
export function StockSearch({ kind, onAddStock }: { kind: "image" | "video"; onAddStock: (url: string, kind: string) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["stock", kind, debounced],
    queryFn: () => searchStock(debounced, kind),
    enabled: debounced.length > 1,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const unavailable = error instanceof Error && /not configured/i.test(error.message);
  const results = data?.results ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search stock ${kind}s…`}
          className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {isFetching ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
      </div>

      {unavailable ? (
        <p className="rounded-lg border border-border p-4 text-center text-xs text-muted-foreground">Stock search isn't set up on this workspace yet.</p>
      ) : error ? (
        <p className="rounded-lg border border-border p-4 text-center text-xs text-muted-foreground">Couldn't reach stock search — try again.</p>
      ) : debounced.length > 1 && !isFetching && results.length === 0 ? (
        <p className="rounded-lg border border-border p-4 text-center text-xs text-muted-foreground">No results for "{debounced}".</p>
      ) : results.length ? (
        <div className={kind === "video" ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"}>
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onAddStock(r.url, r.kind)}
              title="Add to project"
              className="group relative aspect-video overflow-hidden rounded-lg border border-border transition-colors hover:border-[#14b8a6]"
            >
              {/* biome-ignore lint/a11y/useAltText: thumbnail */}
              <img src={r.thumb} loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" />
              {r.duration ? <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] text-white tabular-nums">{fmt(r.duration)}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
