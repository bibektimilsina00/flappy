"use client";

import { ChevronDown, ChevronRight, Plus, Search, Upload, Gem } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const TAGS = ["All", "Saved Items", "Videos", "Audio", "Images", "Subtitles", "Fonts & Colors"];
const SECTIONS = [
  { title: "Saved Items", empty: "No Saved Items", hint: 'Select an item and click "Save to Brand Kit" to share across your team', add: false },
  { title: "Videos", empty: "No Videos", hint: "Upload a video or select one from the Media tab", add: true },
  { title: "Audio", empty: "No Audio", hint: "Upload an audio file or select one from the Audio tab", add: true },
  { title: "Images", empty: "No Images", hint: "Upload an image file", add: true },
  { title: "Subtitles", empty: "No Subtitles", hint: "Create a subtitle style and save to your Brand Kit", add: false },
  { title: "Fonts", empty: "No Fonts", hint: "Click + to add a font", add: true },
  { title: "Colors", empty: "No Colors", hint: "Click + to add a color", add: true },
];

export function BrandKitTab({ onImport }: { onImport: () => void }) {
  const [tag, setTag] = useState("All");

  return (
    <div className="px-3 pt-1">
      <div className="mb-5 space-y-4">
        <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-lg font-semibold transition-colors hover:bg-accent">
          My Workspace <ChevronDown className="size-4 text-muted-foreground" />
        </button>
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input placeholder="Search your assets…" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <button type="button" onClick={onImport} className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent" title="Upload">
            <Upload className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={cn("h-8 rounded-full px-3 text-xs font-semibold transition-colors", tag === t ? "bg-[#14b8a6] text-white" : "bg-secondary text-muted-foreground hover:bg-accent")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((s) => (
          <div key={s.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-4 place-items-center rounded bg-gradient-to-br from-amber-300 to-amber-500 text-black" title="Upgrade">
                  <Gem className="size-2.5 fill-current" />
                </span>
                <h3 className="text-[15px] font-semibold">{s.title}</h3>
                {s.add ? (
                  <button type="button" onClick={onImport} className="grid size-5 place-items-center rounded bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Add">
                    <Plus className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <button type="button" className="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                View all <ChevronRight className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border p-6 text-center">
              <p className="text-sm font-semibold">{s.empty}</p>
              <p className="max-w-[200px] text-sm text-muted-foreground">{s.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
