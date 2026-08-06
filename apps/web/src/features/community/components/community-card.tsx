"use client";

import { Bookmark, Heart, Layers, type LucideIcon, MessageSquare, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { CommunityWork } from "../types";
import { useCommunityStore } from "../stores/use-community-store";

export function CommunityCard({ work, onPlay }: { work: CommunityWork; onPlay?: (work: CommunityWork) => void }) {
  const { likedIds, bookmarkedIds, toggleLike, toggleBookmark } = useCommunityStore();
  const isLiked = likedIds.has(work.id);
  const isBookmarked = bookmarkedIds.has(work.id);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(work.id);
    toast.success(isLiked ? "Removed like" : "Liked work");
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark(work.id);
    toast.success(isBookmarked ? "Removed from bookmarks" : "Bookmarked work");
  };

  return (
    <div className="group space-y-3 cursor-pointer" onClick={() => onPlay?.(work)}>
      <div
        className="relative aspect-video overflow-hidden rounded-xl transition-all duration-300 group-hover:shadow-lg group-hover:scale-[1.01]"
        style={{ background: work.gradient }}
      >
        {work.badge ? (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
            <Layers className="size-3.5" />
            {work.badge}
          </span>
        ) : null}

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex size-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur-md">
            <Play className="ml-0.5 size-5 fill-current" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-2.5 text-xs text-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLike}
              className={cn("flex items-center gap-1 transition-colors hover:text-rose-400", isLiked && "text-rose-500 font-semibold")}
            >
              <Heart className={cn("size-3.5", isLiked && "fill-current")} />
              {work.likes + (isLiked ? 1 : 0)}
            </button>
            <button
              type="button"
              onClick={handleBookmark}
              className={cn("flex items-center gap-1 transition-colors hover:text-amber-400", isBookmarked && "text-amber-400 font-semibold")}
            >
              <Bookmark className={cn("size-3.5", isBookmarked && "fill-current")} />
              {work.bookmarks + (isBookmarked ? 1 : 0)}
            </button>
            <Stat icon={MessageSquare} value={work.comments} />
          </div>
          <span className="font-medium">{work.duration}</span>
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 size-6 shrink-0 rounded-full bg-muted font-bold text-[10px] grid place-items-center uppercase">
          {work.author.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold group-hover:text-primary transition-colors">{work.title}</h3>
          <p className="text-xs text-muted-foreground">{work.author}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{work.timeAgo}</span>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value }: { icon: LucideIcon; value: number }) {
  return (
    <span className="flex items-center gap-1">
      <Icon className="size-3.5" />
      {value}
    </span>
  );
}
