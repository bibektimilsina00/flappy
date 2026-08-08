import posthog from "posthog-js";
import { useCallback, useRef, useState } from "react";
import { authToken } from "@/lib/auth-token";
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
  const [logs, setLogs] = useState<ExecutionEvent[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({});
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, string>>({});
  const [nodeTexts, setNodeTexts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // One socket per in-flight execution — concurrent generations each keep
  // their own event stream (a single shared socket made every new run kill
  // the previous run's stream, leaving its node stuck on "running").
  const socketsRef = useRef<Map<string, WebSocket>>(new Map());

  const closeAll = useCallback(() => {
    for (const ws of socketsRef.current.values()) ws.close();
    socketsRef.current.clear();
  }, []);

  const run = useCallback(
    async (workflowId: string, nodeId?: string) => {
      // Preserve prior outputs across runs — only reset the node about to run.
      // A full-graph run (no nodeId) starts clean and supersedes everything.
      if (nodeId) {
        setNodeStatuses((prev) => ({ ...prev, [nodeId]: "running" }));
      } else {
        closeAll();
        setLogs([]);
        setNodeStatuses({});
        setNodeOutputs({});
        setNodeTexts({});
      }
      setStatus("running");
      setError(null);

      const scope = nodeId ? "node" : "workflow";
      let execution: Awaited<ReturnType<typeof createExecution>>;
      try {
        execution = await createExecution(workflowId, nodeId);
        posthog.capture("workflow_execution_started", { execution_scope: scope });
      } catch (err) {
        // Guardrail refusals (402 insufficient credits) land here.
        setError(err instanceof Error ? err.message : "Run failed");
        if (nodeId) setNodeStatuses((prev) => ({ ...prev, [nodeId]: "failed" }));
        if (socketsRef.current.size === 0) setStatus("failed");
        return;
      }

      const token = await authToken();
      const ws = new WebSocket(
        `${WS_BASE}/api/v1/executions/${execution.id}/ws?token=${token}`,
      );
      socketsRef.current.set(execution.id, ws);

      const finish = (finalStatus: RunStatus) => {
        socketsRef.current.delete(execution.id);
        ws.close();
        // Overall status settles only once every in-flight run has finished.
        if (socketsRef.current.size === 0) setStatus(finalStatus);
      };

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
          posthog.capture("workflow_execution_completed", { execution_scope: scope });
          finish("completed");
        } else if (event.event === "execution.failed") {
          posthog.capture("workflow_execution_failed", { execution_scope: scope });
          finish("failed");
        }
      };
      ws.onerror = () => finish("failed");
    },
    [closeAll],
  );

  // Rehydrate previously-generated outputs (on load / cross-device open).
  const seedOutputs = useCallback((outputs: Record<string, string>) => {
    setNodeOutputs((prev) => ({ ...outputs, ...prev }));
  }, []);

  const reset = useCallback(() => {
    closeAll();
    setLogs([]);
    setNodeStatuses({});
    setNodeOutputs({});
    setNodeTexts({});
    setStatus("idle");
    setError(null);
  }, [closeAll]);

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
