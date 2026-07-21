import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createWorkflow, deleteWorkflow, updateWorkflow } from "../services/workflows-api";

export function useProjectActions() {
  const qc = useQueryClient();
  const router = useRouter();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["workflows"] });

  const create = useMutation({
    mutationFn: () => createWorkflow("Untitled project"),
    onSuccess: (workflow) => {
      invalidate();
      router.push(`/editor?project=${workflow.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: (vars: { id: string; name: string }) =>
      updateWorkflow(vars.id, { name: vars.name }),
    onSuccess: invalidate,
  });

  return { create, remove, rename };
}
