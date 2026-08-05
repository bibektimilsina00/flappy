"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useProjectActions } from "../hooks/use-project-actions";
import { useRecentProjects } from "../hooks/use-recent-projects";
import { NewProjectCard } from "./new-project-card";
import { ProjectCard } from "./project-card";

// Dashboard gallery. Self-contained: wires its own data + create action.
export function RecentProjects() {
  const { projects } = useRecentProjects();
  const { create } = useProjectActions();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight text-white">
          {projects.length > 0 ? "Recent Projects" : "Get Started with a Template"}
        </h2>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-white"
        >
          All projects
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        <NewProjectCard onClick={() => create.mutate()} pending={create.isPending} />
        {projects.map((workflow) => (
          <ProjectCard key={workflow.id} workflow={workflow} />
        ))}

        {/* Demo Starter Templates for New Users */}
        {projects.length === 0 ? (
          <>
            <Link
              href="/clips"
              className="flex w-52 shrink-0 flex-col justify-between rounded-xl border border-white/10 bg-[#161923] p-3.5 transition-all hover:border-teal-400/40 hover:bg-[#1a1e2b]"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold text-teal-400">
                    9:16 Vertical
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400">Score 92</span>
                </div>
                <h4 className="text-xs font-bold text-white">Podcast Viral Short</h4>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                  Auto-hook clip with colorful kinetic captions & audio waveform.
                </p>
              </div>
              <span className="mt-3 text-[11px] font-semibold text-teal-400">Use Template →</span>
            </Link>

            <Link
              href="/video-editor"
              className="flex w-52 shrink-0 flex-col justify-between rounded-xl border border-white/10 bg-[#161923] p-3.5 transition-all hover:border-purple-400/40 hover:bg-[#1a1e2b]"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                    16:9 HD
                  </span>
                  <span className="text-[11px] font-bold text-purple-300">Timeline</span>
                </div>
                <h4 className="text-xs font-bold text-white">Tech Review Highlight</h4>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                  Multi-track video layout with lower thirds & transition effects.
                </p>
              </div>
              <span className="mt-3 text-[11px] font-semibold text-purple-400">Use Template →</span>
            </Link>

            <button
              type="button"
              onClick={() => create.mutate()}
              className="flex w-52 shrink-0 flex-col justify-between rounded-xl border border-white/10 bg-[#161923] p-3.5 text-left transition-all hover:border-sky-400/40 hover:bg-[#1a1e2b]"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                    Canvas
                  </span>
                  <span className="text-[11px] font-bold text-sky-300">AI Script</span>
                </div>
                <h4 className="text-xs font-bold text-white">AI Commercial Promo</h4>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                  Node-based storyboard generator for 40s promotional video scripts.
                </p>
              </div>
              <span className="mt-3 text-[11px] font-semibold text-sky-400">Create Canvas →</span>
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
