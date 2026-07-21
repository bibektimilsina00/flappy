import { useQuery } from "@tanstack/react-query";
import { listModels } from "../services/models-api";

export function useModels(kind: string) {
  return useQuery({ queryKey: ["models", kind], queryFn: () => listModels(kind) });
}
