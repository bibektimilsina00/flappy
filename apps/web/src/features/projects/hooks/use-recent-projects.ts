import { useProjects } from "./use-projects";

export function useRecentProjects(limit = 5) {
  const query = useProjects();
  return { ...query, projects: (query.data ?? []).slice(0, limit) };
}
