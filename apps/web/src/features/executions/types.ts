export type NodeStatus = "running" | "succeeded" | "failed" | "skipped";

export type RunStatus = "idle" | "running" | "completed" | "failed";

export interface ExecutionEvent {
  event: string;
  node_id: string | null;
  message: string | null;
  data: Record<string, unknown>;
  ts: string;
}
