export interface WorkflowGraph {
  nodes: unknown[];
  edges: unknown[];
}

export interface Workflow {
  id: string;
  name: string;
  graph: WorkflowGraph;
  created_at: string;
  updated_at: string;
}

export type ProjectView = "grid" | "list";
