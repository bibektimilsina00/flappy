import { Clapperboard, Component } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const ACCENT = "#14b8a6";

/**
 * Workflow ⇄ Video switcher — VSCode-style editor tabs: the active tab shares the
 * content background (they merge) while inactive tabs sit on the darker tab-bar
 * surface. Both editors key on the same project id, so it flips client-side, cached.
 */
const TABS = [
  { id: "canvas", label: "Canvas", Icon: Component, to: (id: string) => `/canvas?project=${id}` },
  { id: "video", label: "Editor", Icon: Clapperboard, to: (id: string) => `/video-editor?project=${id}` },
] as const;

export function EditorModeTabs({ projectId, mode }: { projectId: string; mode: "canvas" | "video" }) {
  return (
    <div className="flex w-full shrink-0 items-stretch bg-card text-[13px]">
      {TABS.map(({ id, label, Icon, to }) => {
        const active = id === mode;
        return (
          <Link
            key={id}
            href={to(projectId)}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2 border-r border-border px-4 py-1.5 font-medium transition-colors last:border-r-0",
              active ? "bg-background text-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" style={active ? { color: ACCENT } : undefined} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
