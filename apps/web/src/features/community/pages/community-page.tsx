"use client";

import { useQuery } from "@tanstack/react-query";
import { Compass, Film, Flame, Layers, Loader2, Search, Sparkles, Tv, Video, Wand2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { CommunityCard } from "../components/community-card";
import { fetchCommunityWorks } from "../services/community-api";
import { useCommunityStore } from "../stores/use-community-store";
import type { CommunityWork } from "../types";

const CATEGORIES = [
  { id: "all", label: "All Works", icon: Compass },
  { id: "short film", label: "Short Films", icon: Film },
  { id: "commercial", label: "Commercials", icon: Tv },
  { id: "vfx", label: "VFX & CGI", icon: Wand2 },
  { id: "animation", label: "Animations", icon: Video },
];

export function CommunityPage() {
  const { searchQuery, selectedCategory, setSearchQuery, setSelectedCategory } = useCommunityStore();
  const [activeVideo, setActiveVideo] = useState<CommunityWork | null>(null);

  const { data: works = [], isLoading } = useQuery({
    queryKey: ["community-works", searchQuery, selectedCategory],
    queryFn: () => fetchCommunityWorks(searchQuery, selectedCategory),
  });

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 p-8 text-white shadow-xl border border-teal-800/30">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-medium text-teal-300 border border-teal-500/30">
            <Sparkles className="size-3.5" />
            Explore Creator Showcase
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Community Works & Showcase
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Discover thousands of AI video creations, prompt-to-scene workflows, and short films built by top creators on Riocut.
          </p>
        </div>
        <div className="absolute right-0 top-0 -mr-12 -mt-12 size-72 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200",
                  active
                    ? "bg-teal-500 text-black font-semibold shadow-md shadow-teal-500/20"
                    : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creations or authors..."
            className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-8 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-8 animate-spin text-teal-500" />
        </div>
      ) : works.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Compass className="mx-auto size-10 text-muted-foreground/60" />
          <h3 className="mt-4 text-base font-semibold">No creations found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Try resetting your search query or selecting a different category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((work) => (
            <CommunityCard key={work.id} work={work} onPlay={(w) => setActiveVideo(w)} />
          ))}
        </div>
      )}

      {/* Lightbox / Video Modal */}
      {activeVideo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveVideo(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X className="size-4" />
            </button>
            <div
              className="relative aspect-video w-full overflow-hidden rounded-xl"
              style={{ background: activeVideo.gradient }}
            >
              <div className="grid h-full place-items-center bg-black/40 text-center p-6">
                <div>
                  <Flame className="mx-auto size-12 text-teal-400 animate-pulse" />
                  <p className="mt-3 text-lg font-bold">{activeVideo.title}</p>
                  <p className="text-xs text-slate-300">Created by {activeVideo.author}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Duration: {activeVideo.duration}</span>
              <span>Posted {activeVideo.timeAgo}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
