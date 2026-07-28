import Link from "next/link";
import { formatUpdated, gradientFor } from "../lib/display";
import type { Workflow } from "../types";
import { ProjectThumb } from "./project-thumb";

export function ProjectCard({ workflow }: { workflow: Workflow }) {
  return (
    <Link
      href={`/canvas?project=${workflow.id}`}
      className="group relative flex h-40 w-56 shrink-0 flex-col justify-end overflow-hidden rounded-xl p-3 text-left"
      style={{ background: gradientFor(workflow.id) }}
    >
      {workflow.thumbnail ? (
        <div className="absolute inset-0">
          <ProjectThumb src={workflow.thumbnail} />
        </div>
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      <div className="relative">
        <h3 className="truncate text-sm font-semibold text-white">{workflow.name}</h3>
        <p className="text-xs text-white/70">{formatUpdated(workflow.updated_at)}</p>
      </div>
    </Link>
  );
}
