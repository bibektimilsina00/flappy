"use client";

import { Film, Scissors, Sparkles, Wand2, Youtube } from "lucide-react";
import Link from "next/link";

interface QuickStarterGridProps {
  onSelectPrompt?: (prompt: string, kind: "video" | "image" | "text") => void;
}

export function QuickStarterGrid({ onSelectPrompt }: QuickStarterGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight text-white">
          Create & Edit
        </h2>
        <span className="text-xs text-muted-foreground">Choose a quick workflow</span>
      </div>

      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
        {/* Card 1: Viral Clips */}
        <Link
          href="/clips"
          className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[#191c26] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-400/50 hover:bg-[#1e2230] hover:shadow-lg hover:shadow-teal-500/5"
        >
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="grid size-9 place-items-center rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20">
                <Youtube className="size-5" />
              </div>
              <span className="rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                Popular
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-teal-300">
              YouTube to Viral Shorts
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              Paste any YouTube link to extract top viral clips with AI scores & captions.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-teal-400">
            <span>Import Video</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </Link>

        {/* Card 2: AI Video Generator */}
        <button
          type="button"
          onClick={() =>
            onSelectPrompt?.(
              "Cinematic drone shot over glowing futuristic cyberpunk city, 4k ultra realistic",
              "video"
            )
          }
          className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[#191c26] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-400/50 hover:bg-[#1e2230] hover:shadow-lg hover:shadow-purple-500/5"
        >
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="grid size-9 place-items-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                <Wand2 className="size-5" />
              </div>
              <span className="rounded-full bg-purple-400/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                AI Prompt
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-purple-300">
              AI Video Generation
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              Generate 10s cinematic video clips from text prompts using AI.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-purple-400">
            <span>Try Demo Prompt</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </button>

        {/* Card 3: Multi-track Studio Editor */}
        <Link
          href="/video-editor"
          className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[#191c26] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/50 hover:bg-[#1e2230] hover:shadow-lg hover:shadow-sky-500/5"
        >
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="grid size-9 place-items-center rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20">
                <Film className="size-5" />
              </div>
              <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                Studio
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-sky-300">
              Multi-Track Video Editor
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              Trim clips, add auto-captions, transition effects, and export in 4K.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-sky-400">
            <span>Open Timeline Editor</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
