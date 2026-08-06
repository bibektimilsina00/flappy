"use client";

import {
  ChevronDown,
  Clock,
  ImageIcon as LucideImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Maximize2,
  Pencil,
  RectangleHorizontal,
  Sparkles,
  Users,
  UserRoundCog,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useGeneration } from "../../hooks/use-generation";

const IMAGE_MODES = new Set(["text-to-image", "image-editor", "upscale"]);

const ACCENT = "#14b8a6";

const NAV = [
  {
    group: "Images",
    items: [
      { id: "text-to-image", label: "Generate images", icon: LucideImageIcon },
      { id: "image-editor", label: "Image editor", icon: Pencil },
      { id: "upscale", label: "Image upscale", icon: Maximize2 },
    ],
  },
  {
    group: "Video",
    items: [
      { id: "text-to-video", label: "Generate videos", icon: Video },
      { id: "video-edits", label: "Video edits", icon: Wand2 },
    ],
  },
  {
    group: "Characters",
    items: [
      { id: "talking-video", label: "Talking video", icon: Users },
      { id: "character-swap", label: "Character swap", icon: UserRoundCog },
    ],
  },
] as const;

const PROMPTS: Record<string, string> = {
  "text-to-image": "Describe the image you want to create",
  "image-editor": "Describe how to edit your image",
  upscale: "Upload an image to upscale",
  "text-to-video": "Describe the video you want to create",
  "video-edits": "Describe the edit you want to make",
  "talking-video": "Write the script your character will say",
  "character-swap": "Describe the character swap",
};

export function AiPlayground({ open, onClose, initialMode = "text-to-video", projectId }: { open: boolean; onClose: () => void; initialMode?: string; projectId: string }) {
  const [active, setActive] = useState(initialMode);
  const [prompt, setPrompt] = useState("");
  const [enhance, setEnhance] = useState(true);
  const gen = useGeneration(projectId);
  const kind = IMAGE_MODES.has(active) ? "image" : "video";

  // sync the active category to the mode the modal was opened with
  useEffect(() => {
    if (open) setActive(initialMode);
  }, [open, initialMode]);

  // close once the generated asset lands in the media pool
  useEffect(() => {
    if (gen.status === "done") {
      gen.reset();
      setPrompt("");
      onClose();
    }
  }, [gen.status, gen.reset, onClose]);

  const generate = () => {
    if (!prompt.trim() || gen.running) return;
    gen.run({ kind, prompt: prompt.trim() });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section className="relative flex h-full max-h-[calc(100vh-96px)] w-full max-w-[1600px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-7 place-items-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* sidebar */}
        <nav className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-border px-4 pt-8 [scrollbar-width:thin]">
          <h2 className="px-3 pb-6 text-lg font-semibold">Generate</h2>
          <button type="button" className="mb-7 flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-accent">
            <Layers className="size-4 shrink-0" /> Your assets
          </button>
          <div className="flex flex-1 flex-col gap-7">
            {NAV.map((cat) => (
              <div key={cat.group} className="flex flex-col gap-2">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground">{cat.group}</h3>
                {cat.items.map((item) => {
                  const on = active === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActive(item.id)}
                      className={cn(
                        "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                        on ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" style={on ? { color: ACCENT } : undefined} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <button type="button" className="mx-auto mb-8 mt-6 flex h-10 items-center gap-2 rounded-lg bg-secondary px-3 text-sm font-medium transition-colors hover:bg-accent">
            <Sparkles className="size-3.5 text-[#bbf451]" /> 0 Credits <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </nav>

        {/* content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground">
            {gen.running ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-6 animate-spin text-[#14b8a6]" />
                <p>Generating your {kind}… this can take a moment.</p>
              </div>
            ) : gen.error ? (
              <p className="max-w-sm text-red-400">{gen.error}</p>
            ) : (
              <p className="max-w-sm">Your generations appear in the Media pool. Describe what you want below and hit Generate.</p>
            )}
          </main>

          {/* prompt bar */}
          <div className="mx-auto w-full max-w-[760px] p-6 pt-0">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex gap-3 p-4">
                <button
                  type="button"
                  title="Upload an image or video"
                  className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed border-border bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary"
                >
                  <ImagePlus className="size-5" />
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={PROMPTS[active] ?? "Describe what you want to create"}
                    rows={2}
                    className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <Chip>
                        <span className="size-3.5 rounded-full bg-gradient-to-br from-[#14b8a6] to-purple-500" />
                        AI model <span className="text-muted-foreground">(Kling 2.5 Turbo Pro)</span>
                      </Chip>
                      <span className="mx-1 h-4 w-px bg-border" />
                      <Chip>
                        <RectangleHorizontal className="size-4 text-muted-foreground" /> 16:9
                      </Chip>
                      <Chip>
                        <Clock className="size-4 text-muted-foreground" /> 5s
                      </Chip>
                      <button
                        type="button"
                        onClick={() => setEnhance((v) => !v)}
                        className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition-colors hover:bg-accent"
                      >
                        <span className={cn("flex h-4 w-7 items-center rounded-full px-0.5 transition-colors", enhance ? "bg-[#14b8a6]" : "bg-border")}>
                          <span className={cn("size-3 rounded-full bg-white transition-transform", enhance ? "translate-x-3" : "translate-x-0")} />
                        </span>
                        Enhance
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={generate}
                      disabled={gen.running || !prompt.trim()}
                      className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {gen.running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      {gen.running ? "Generating" : "Generate"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors hover:bg-accent">
      {children}
    </button>
  );
}
