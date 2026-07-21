import { useQuery } from "@tanstack/react-query";
import { listWorkflows } from "../services/workflows-api";
import type { Workflow } from "../types";

function byUpdatedDesc(a: Workflow, b: Workflow) {
  return b.updated_at.localeCompare(a.updated_at);
}

export function useProjects() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: listWorkflows,
    select: (workflows) => [...workflows].sort(byUpdatedDesc),
  });
}
