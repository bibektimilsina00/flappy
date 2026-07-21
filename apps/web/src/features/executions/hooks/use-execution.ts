import { useCallback, useRef, useState } from "react";
import { useSession } from "@/stores/session";
import { createExecution } from "../services/executions-api";
import type { ExecutionEvent, NodeStatus, RunStatus } from "../types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

const EVENT_TO_STATUS: Record<string, NodeStatus> = {
  "node.started": "running",
  "node.succeeded": "succeeded",
  "node.failed": "failed",
  "node.skipped": "skipped",
};

export function useExecution() {
  const token = useSession((s) => s.token);
  const [logs, setLogs] = useState<ExecutionEvent[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({});
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, string>>({});
  const [nodeTexts, setNodeTexts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const run = useCallback(
    async (workflowId: string, nodeId?: string) => {
      wsRef.current?.close();
      setLogs([]);
      // Preserve prior outputs across runs — only reset the node about to run.
      // A full-graph run (no nodeId) starts clean.
      if (nodeId) {
        setNodeStatuses((prev) => ({ ...prev, [nodeId]: "running" }));
      } else {
        setNodeStatuses({});
        setNodeOutputs({});
        setNodeTexts({});
      }
      setStatus("running");
      setError(null);

      let execution: Awaited<ReturnType<typeof createExecution>>;
      try {
        execution = await createExecution(workflowId, nodeId);
      } catch (err) {
        // Guardrail refusals (402 insufficient credits) land here.
        setError(err instanceof Error ? err.message : "Run failed");
        setStatus("failed");
        if (nodeId) setNodeStatuses((prev) => ({ ...prev, [nodeId]: "failed" }));
        return;
      }

      const ws = new WebSocket(
        `${WS_BASE}/api/v1/executions/${execution.id}/ws?token=${token}`,
      );
      wsRef.current = ws;

      ws.onmessage = (message) => {
        const event = JSON.parse(message.data) as ExecutionEvent;
        setLogs((prev) => [...prev, event]);

        const nodeStatus = EVENT_TO_STATUS[event.event];
        if (event.node_id && nodeStatus) {
          setNodeStatuses((prev) => ({ ...prev, [event.node_id as string]: nodeStatus }));
        }
        if (event.event === "node.succeeded" && event.node_id) {
          const url = event.data?.url;
          if (typeof url === "string") {
            setNodeOutputs((prev) => ({ ...prev, [event.node_id as string]: url }));
          }
          const text = event.data?.text;
          if (typeof text === "string") {
            setNodeTexts((prev) => ({ ...prev, [event.node_id as string]: text }));
          }
        }
        if (event.event === "execution.completed") {
          setStatus("completed");
          ws.close();
        } else if (event.event === "execution.failed") {
          setStatus("failed");
          ws.close();
        }
      };
      ws.onerror = () => setStatus("failed");
    },
    [token],
  );

  // Rehydrate previously-generated outputs (on load / cross-device open).
  const seedOutputs = useCallback((outputs: Record<string, string>) => {
    setNodeOutputs((prev) => ({ ...outputs, ...prev }));
  }, []);

  const reset = useCallback(() => {
    wsRef.current?.close();
    setLogs([]);
    setNodeStatuses({});
    setNodeOutputs({});
    setNodeTexts({});
    setStatus("idle");
    setError(null);
  }, []);

  return {
    logs,
    nodeStatuses,
    nodeOutputs,
    nodeTexts,
    status,
    error,
    running: status === "running",
    run,
    reset,
    seedOutputs,
  };
}
