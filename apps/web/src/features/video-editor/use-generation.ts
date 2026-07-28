"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { generateInProject, getExecution } from "./api";

export type GenBody = {
  kind: "image" | "video";
  prompt: string;
  model?: string | null;
  params?: Record<string, unknown>;
  source_asset_id?: string | null;
};
type Status = "idle" | "running" | "done" | "error";

/**
 * Run one AI generation and surface the result. Kicks off the server-side execution,
 * polls it, and on completion invalidates the editor project so the new asset shows up
 * in the Media pool (same refresh path uploads use). Panels stay dumb — they call run().
 */
export function useGeneration(projectId: string) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [execId, setExecId] = useState<string | null>(null);

  const poll = useQuery({
    queryKey: ["execution", execId],
    queryFn: () => getExecution(execId as string),
    enabled: !!execId && status === "running",
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "completed" || s === "failed" ? false : 1500;
    },
  });

  useEffect(() => {
    const s = poll.data?.status;
    if (status !== "running" || !s) return;
    if (s === "completed") {
      setStatus("done");
      setExecId(null);
      qc.invalidateQueries({ queryKey: ["editor-project", projectId] });
      qc.invalidateQueries({ queryKey: ["balance"] });
    } else if (s === "failed") {
      setStatus("error");
      setError(poll.data?.error ?? "Generation failed");
      setExecId(null);
    }
  }, [poll.data?.status, poll.data?.error, status, projectId, qc]);

  const run = useCallback(
    async (body: GenBody) => {
      setError(null);
      setStatus("running");
      try {
        const { execution_id } = await generateInProject(projectId, body);
        setExecId(execution_id);
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    },
    [projectId],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setExecId(null);
  }, []);

  return { run, reset, status, error, running: status === "running" };
}
