"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function FilterMenu({
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
          open || dirty
            ? "border-muted-foreground/40 text-foreground"
            : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        <SlidersHorizontal className="size-4" />
        Filter
        {dirty ? <span className="size-1.5 rounded-full bg-[#14b8a6]" /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-border bg-secondary p-2 shadow-xl">
          <FilterGroup
            label="Type"
            value={type}
            onChange={(v) => setType(v as "all" | "image" | "video" | "audio")}
            options={[
              ["all", "All"],
              ["image", "Images"],
              ["video", "Videos"],
              ["audio", "Audio"],
            ]}
          />
          <FilterGroup
            label="Source"
            value={source}
            onChange={(v) => setSource(v as "all" | "uploaded" | "generated")}
            options={[
              ["all", "All"],
              ["uploaded", "Uploaded"],
              ["generated", "Generated"],
            ]}
          />
          <FilterGroup
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as "newest" | "oldest")}
            options={[
              ["newest", "Newest first"],
              ["oldest", "Oldest first"],
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
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
          {value === val ? <Check className="size-3.5 text-[#14b8a6]" /> : null}
        </button>
      ))}
    </div>
  );
}
