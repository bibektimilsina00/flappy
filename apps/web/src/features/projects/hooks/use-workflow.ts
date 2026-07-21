import { useQuery } from "@tanstack/react-query";
import { getWorkflow } from "../services/workflows-api";

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ["workflow", id],
    queryFn: () => getWorkflow(id as string),
    enabled: Boolean(id),
  });
}
