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
  thumbnail?: string | null; // first image (else first video) asset, presigned
}

export type ProjectView = "grid" | "list";
