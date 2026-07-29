"use client";

import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Component, Scissors } from "lucide-react";
import Link from "next/link";
import { jobByWorkflow } from "@/features/clips/api";
import { cn } from "@/lib/cn";

const ACCENT = "#14b8a6";

/**
 * Workflow ⇄ Video (⇄ Clips) switcher — VSCode-style editor tabs. The Clips tab
 * appears only when this project is linked to a clips job.
 */
const TABS = [
  { id: "canvas", label: "Canvas", Icon: Component, to: (id: string) => `/canvas?project=${id}` },
  { id: "video", label: "Editor", Icon: Clapperboard, to: (id: string) => `/video-editor?project=${id}` },
] as const;

export function EditorModeTabs({ projectId, mode }: { projectId: string; mode: "canvas" | "video" | "clips" }) {
  const { data: clipsLink } = useQuery({
    queryKey: ["clips-by-workflow", projectId],
    queryFn: () => jobByWorkflow(projectId).catch(() => null),
    staleTime: 5 * 60_000,
  });

  const tabs = [
    ...TABS.map((t) => ({ ...t, href: t.to(projectId) })),
    ...(clipsLink?.job_id
      ? [{ id: "clips" as const, label: "Clips", Icon: Scissors, href: `/clips/${clipsLink.job_id}` }]
      : []),
  ];

  return (
    <div className="flex w-full shrink-0 items-stretch bg-card text-[13px]">
      {tabs.map(({ id, label, Icon, href }) => {
        const active = id === mode;
        return (
          <Link
            key={id}
            href={href}
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
