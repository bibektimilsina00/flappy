"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export type Voice = { id: string; name: string; tags: string[] };

// A searchable voice list with rich rows (avatar + name + trait chips) — replaces
// the native <select>. Expands inline so it never gets clipped by the scroll area.
export function VoicePicker({ voices, value, onChange }: { voices: Voice[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = voices.find((v) => v.id === value) ?? voices[0];
  const query = q.trim().toLowerCase();
  const filtered = query ? voices.filter((v) => v.name.toLowerCase().includes(query) || v.tags.some((t) => t.includes(query))) : voices;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm transition-colors hover:bg-accent"
      >
        <Avatar name={selected.name} />
        <span className="min-w-0 flex-1 truncate text-left font-medium">{selected.name}</span>
        <span className="shrink-0 truncate text-[11px] text-muted-foreground">{selected.tags[0]}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            {/* biome-ignore lint/a11y/noAutofocus: focus the search when the picker opens */}
            <input
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search voices…"
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto [scrollbar-width:thin]">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">No voices found</p>
            ) : (
              filtered.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onChange(v.id);
                    setOpen(false);
                    setQ("");
                  }}
                  className={cn("flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent", v.id === value && "bg-[#14b8a6]/10")}
                >
                  <Avatar name={v.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.name}</p>
                    <div className="flex flex-wrap text-[11px] text-muted-foreground">
                      {v.tags.map((t, i) => (
                        <span key={t} className={i < v.tags.length - 1 ? "after:mx-1 after:font-bold after:text-border after:content-['·']" : ""}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {v.id === value ? <Check className="size-4 shrink-0 text-[#14b8a6]" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">{name.slice(0, 1).toUpperCase()}</span>;
}
