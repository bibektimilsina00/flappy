"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

export interface ThreadMeta {
  id: string;
  title: string;
  updated_at: string;
}

export type AssistantOp =
  | { op: "add_node"; id: string; kind: "text" | "image" | "video" | "audio"; prompt?: string; text?: string; model?: string; params?: string }
  | { op: "update_node"; id: string; prompt?: string; text?: string; model?: string; params?: string }
  | { op: "connect"; source: string; target: string }
  | { op: "delete_node"; id: string }
  | { op: "run_node"; id: string };

interface GraphNodeSummary {
  id: string;
  type?: string;
  data: Record<string, unknown>;
}

interface ChatResponse {
  thread_id: string;
  reply: string;
  operations?: AssistantOp[];
  suggestions?: string[];
}

/**
 * Editor assistant chat with per-project persisted threads. Loads the project's
 * most recent conversation on open; supports history + switching + new/delete.
 */
export function useAssistantChat(
  workflowId: string | undefined,
  getNodes: () => GraphNodeSummary[],
  applyOps: (ops: AssistantOp[]) => void,
) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const query = workflowId ? `?workflow_id=${workflowId}` : "";

  const loadThreads = useCallback(async () => {
    try {
      setThreads(await api<ThreadMeta[]>(`/assistant/threads${query}`));
    } catch {
      /* offline / not signed in — ignore */
    }
  }, [query]);

  const openThread = useCallback(async (id: string) => {
    try {
      const t = await api<{ id: string; title: string; messages: ChatMsg[] }>(`/assistant/threads/${id}`);
      setThreadId(t.id);
      setMessages(t.messages ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  // On project change: load the thread list and reopen the most recent one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only per project
  useEffect(() => {
    let cancelled = false;
    setThreadId(null);
    setMessages([]);
    (async () => {
      try {
        const list = await api<ThreadMeta[]>(`/assistant/threads${query}`);
        if (cancelled) return;
        setThreads(list);
        if (list.length) {
          const t = await api<{ id: string; title: string; messages: ChatMsg[] }>(`/assistant/threads/${list[0].id}`);
          if (!cancelled) {
            setThreadId(t.id);
            setMessages(t.messages ?? []);
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const send = useCallback(
    async (text: string) => {
      setMessages((m) => [...m, { role: "user", content: text }]);
      setLoading(true);
      try {
        const res = await api<ChatResponse>("/assistant/chat", {
          method: "POST",
          body: JSON.stringify({
            message: text,
            thread_id: threadId,
            workflow_id: workflowId ?? null,
            nodes: getNodes(),
          }),
        });
        setThreadId(res.thread_id);
        setMessages((m) => [...m, { role: "assistant", content: res.reply, suggestions: res.suggestions }]);
        if (res.operations?.length) applyOps(res.operations);
        loadThreads();
      } catch (e) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Request failed"}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [threadId, workflowId, getNodes, applyOps, loadThreads],
  );

  const newThread = useCallback(() => {
    setThreadId(null);
    setMessages([]);
  }, []);

  const deleteThread = useCallback(
    async (id: string) => {
      try {
        await api<void>(`/assistant/threads/${id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
      setThreadId((cur) => {
        if (cur === id) setMessages([]);
        return cur === id ? null : cur;
      });
      loadThreads();
    },
    [loadThreads],
  );

  return { messages, loading, threads, threadId, send, openThread, newThread, deleteThread };
}
