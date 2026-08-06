"use client";

import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Component, Scissors } from "lucide-react";
import Link from "next/link";
import { jobByWorkflow } from "@/features/clips";
import { cn } from "@/lib/cn";

const ACCENT = "#14b8a6";

/**
 * Workflow ⇄ Video ⇄ Clips switcher — VSCode-style editor tabs. Clips routes
 * to the linked job when one exists, else to the project-scoped clips landing.
 */
const TABS = [
  { id: "canvas", label: "Canvas", Icon: Component, to: (id: string | null) => (id ? `/canvas?project=${id}` : "/canvas") },
  { id: "video", label: "Editor", Icon: Clapperboard, to: (id: string | null) => (id ? `/video-editor?project=${id}` : "/video-editor") },
] as const;

// projectId null = no project yet; the tabs still switch between the bare pages.
export function EditorModeTabs({
  projectId,
  mode,
  className,
}: {
  projectId: string | null;
  mode: "canvas" | "video" | "clips";
  className?: string;
}) {
  const { data: clipsLink } = useQuery({
    queryKey: ["clips-by-workflow", projectId],
    queryFn: () => jobByWorkflow(projectId as string).catch(() => null),
    staleTime: 5 * 60_000,
    enabled: Boolean(projectId),
  });

  const tabs = [
    ...TABS.map((t) => ({ ...t, href: t.to(projectId) })),
    {
      id: "clips" as const,
      label: "Clips",
      Icon: Scissors,
      // Linked job first, then the project-scoped landing, then the bare page.
      href: clipsLink?.job_id
        ? `/clips/${clipsLink.job_id}`
        : projectId
          ? `/clips?project=${projectId}`
          : "/clips",
    },
  ];

  return (
    <div className={cn("flex w-full shrink-0 items-stretch bg-card text-[13px]", className)}>
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
