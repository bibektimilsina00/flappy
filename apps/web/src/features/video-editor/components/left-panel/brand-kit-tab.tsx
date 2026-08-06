"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Music, Plus, Search, Upload, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { addBrandKitToProject, addToBrandKit, type BrandKitItem, listBrandKit, removeFromBrandKit } from "../../services/video-editor-api";

const SECTIONS: { kind: string; title: string; empty: string }[] = [
  { kind: "image", title: "Images", empty: "No images saved yet" },
  { kind: "video", title: "Videos", empty: "No videos saved yet" },
  { kind: "audio", title: "Audio", empty: "No audio saved yet" },
  { kind: "color", title: "Colors", empty: "No colors saved yet" },
];

// Web-safe families the preview can render without loading a font file.
const FONT_CHOICES = [
  "Inter, system-ui, sans-serif",
  "Georgia, serif",
  "Times New Roman, serif",
  "Arial, sans-serif",
  "Verdana, sans-serif",
  "Trebuchet MS, sans-serif",
  "Courier New, monospace",
  "Impact, sans-serif",
  "Comic Sans MS, cursive",
  "Palatino, serif",
];

export function BrandKitTab({ onImport, projectId, onApplyFont }: { onImport: () => void; projectId: string; onApplyFont: (family: string) => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["brand-kit"], queryFn: listBrandKit });

  const remove = useMutation({
    mutationFn: removeFromBrandKit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand-kit"] }),
  });
  const addToProject = useMutation({
    mutationFn: (itemId: string) => addBrandKitToProject(projectId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["editor-project", projectId] }),
  });
  const addFont = useMutation({
    mutationFn: (font: string) => addToBrandKit({ kind: "font", font }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand-kit"] }),
  });

  const items = (data?.items ?? []).filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-3 pt-1">
      <div className="mb-5 space-y-4">
        <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-lg font-semibold transition-colors hover:bg-accent">
          My Workspace <ChevronDown className="size-4 text-muted-foreground" />
        </button>
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your assets…" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <button type="button" onClick={onImport} className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent" title="Upload">
            <Upload className="size-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((s) => {
            const rows = items.filter((i) => i.kind === s.kind);
            return (
              <div key={s.kind} className="space-y-3">
                <h3 className="text-[15px] font-semibold">{s.title}</h3>
                {rows.length === 0 ? (
                  <div className="rounded-lg border border-border p-5 text-center text-sm text-muted-foreground">{s.empty}</div>
                ) : s.kind === "color" ? (
                  <div className="grid grid-cols-8 gap-1.5">
                    {rows.map((i) => (
                      <BrandColor key={i.id} item={i} onRemove={() => remove.mutate(i.id)} />
                    ))}
                  </div>
                ) : (
                  <div className={cn("grid gap-2.5", s.kind === "audio" ? "grid-cols-1" : "grid-cols-3")}>
                    {rows.map((i) => (
                      <BrandMedia key={i.id} item={i} onAdd={() => addToProject.mutate(i.id)} onRemove={() => remove.mutate(i.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Fonts</h3>
              <FontPicker disabled={addFont.isPending} onPick={(f) => addFont.mutate(f)} />
            </div>
            {(() => {
              const fonts = items.filter((i) => i.kind === "font");
              return fonts.length === 0 ? (
                <div className="rounded-lg border border-border p-5 text-center text-sm text-muted-foreground">No fonts saved yet</div>
              ) : (
                <div className="space-y-1.5">
                  {fonts.map((i) => (
                    <div key={i.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onApplyFont(i.font ?? i.name)}
                        title="Apply to selected text"
                        className="flex w-full items-center rounded-lg border border-border bg-secondary px-3 py-2.5 text-left text-base transition-colors hover:border-[#14b8a6]"
                        style={{ fontFamily: i.font ?? i.name }}
                      >
                        <span className="truncate">{i.name}</span>
                      </button>
                      <RemoveBtn onRemove={() => remove.mutate(i.id)} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <p className="pt-2 text-center text-[11px] text-muted-foreground">Use "Save to Brand Kit" on a clip to add items here.</p>
        </div>
      )}
    </div>
  );
}

function BrandColor({ item, onRemove }: { item: BrandKitItem; onRemove: () => void }) {
  return (
    <div className="group relative">
      <span className="block aspect-square rounded-md border border-border" style={{ backgroundColor: item.color }} title={item.color} />
      <RemoveBtn onRemove={onRemove} />
    </div>
  );
}

function BrandMedia({ item, onAdd, onRemove }: { item: BrandKitItem; onAdd: () => void; onRemove: () => void }) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onAdd}
        title="Add to this project"
        className={cn("flex w-full items-center overflow-hidden rounded-lg border border-border bg-secondary transition-colors hover:border-[#14b8a6]", item.kind === "audio" ? "gap-2 px-3 py-2" : "aspect-video")}
      >
        {item.kind === "video" ? (
          // biome-ignore lint/a11y/useMediaCaption: thumbnail
          <video src={item.url} muted playsInline preload="metadata" className="size-full object-cover" />
        ) : item.kind === "audio" ? (
          <>
            <Music className="size-4 shrink-0 text-muted-foreground" /> <span className="truncate text-left text-xs">{item.name}</span>
          </>
        ) : (
          // biome-ignore lint/a11y/useAltText: thumbnail
          <img src={item.url} className="size-full object-cover" />
        )}
      </button>
      <RemoveBtn onRemove={onRemove} />
    </div>
  );
}

function FontPicker({ onPick, disabled }: { onPick: (family: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        <Plus className="size-3.5" /> Add font
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-2xl">
            {FONT_CHOICES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  onPick(f);
                  setOpen(false);
                }}
                className="block w-full truncate rounded-lg px-3 py-2 text-left text-base transition-colors hover:bg-accent"
                style={{ fontFamily: f }}
              >
                {f.split(",")[0]}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function RemoveBtn({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      title="Remove"
      className="absolute right-1 top-1 hidden size-5 place-items-center rounded-full bg-black/60 text-white group-hover:grid hover:bg-red-500"
    >
      <X className="size-3" />
    </button>
  );
}
