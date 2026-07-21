import { Bookmark, Heart, Layers, type LucideIcon, MessageSquare } from "lucide-react";
import type { CommunityWork } from "../types";

export function CommunityCard({ work }: { work: CommunityWork }) {
  return (
    <div className="space-y-3">
      <div
        className="relative aspect-video overflow-hidden rounded-xl"
        style={{ background: work.gradient }}
      >
        {work.badge ? (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
            <Layers className="size-3.5" />
            {work.badge}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 py-2.5 text-xs text-white">
          <div className="flex items-center gap-3">
            <Stat icon={Heart} value={work.likes} />
            <Stat icon={Bookmark} value={work.bookmarks} />
            <Stat icon={MessageSquare} value={work.comments} />
          </div>
          <span className="font-medium">{work.duration}</span>
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 size-6 shrink-0 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{work.title}</h3>
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
