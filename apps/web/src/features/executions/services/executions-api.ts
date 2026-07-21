import { api } from "@/lib/api";

export interface Execution {
  id: string;
  workflow_id: string;
  status: string;
}

export function createExecution(workflowId: string, nodeId?: string): Promise<Execution> {
  return api<Execution>("/executions", {
    method: "POST",
    body: JSON.stringify({ workflow_id: workflowId, node_id: nodeId ?? null }),
  });
}
