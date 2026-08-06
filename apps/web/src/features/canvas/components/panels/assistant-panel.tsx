"use client";

import { History, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMsg, ThreadMeta } from "../../hooks/use-assistant-chat";
import { AssistantInput } from "./assistant-input";
import { Markdown } from "../shared/markdown";

const SUGGESTIONS = [
  "Build a 30s product ad: script → keyframe → video",
  "Write a punchy 15-second hook script",
  "Add an image node and a video node, connected",
  "What can this platform do?",
];

export function AssistantPanel({
  onClose,
  messages,
  loading,
  onSend,
  onNewThread,
  threads,
  activeThreadId,
  onOpenThread,
  onDeleteThread,
}: {
  onClose: () => void;
  messages: ChatMsg[];
  loading: boolean;
  onSend: (text: string) => void;
  onNewThread: () => void;
  threads: ThreadMeta[];
  activeThreadId: string | null;
  onOpenThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-[#c2b558]" />
          {historyOpen ? "History" : "Assistant"}
        </span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <button
            aria-label="New chat"
            onClick={() => {
              onNewThread();
              setHistoryOpen(false);
            }}
            className="rounded p-1 hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
          <button
            aria-label="History"
            onClick={() => setHistoryOpen((v) => !v)}
            className={`rounded p-1 hover:text-foreground ${historyOpen ? "text-foreground" : ""}`}
          >
            <History className="size-4" />
          </button>
          <button aria-label="Close" onClick={onClose} className="rounded p-1 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {historyOpen ? (
        <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2 [scrollbar-width:thin]">
          {threads.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent ${
                  t.id === activeThreadId ? "bg-accent" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onOpenThread(t.id);
                    setHistoryOpen(false);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm">{t.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(t.updated_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => onDeleteThread(t.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-2 [scrollbar-width:thin]">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
              <p className="text-sm text-muted-foreground">
                I can answer questions, write scripts, and build or edit your workflow.
              </p>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSend(s)}
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === "user" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat log
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm">
                    {m.content}
                  </div>
                </div>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat log
                <div key={i} className="space-y-2 text-sm">
                  <Markdown content={m.content} />
                  {m.suggestions?.length && i === messages.length - 1 && !loading ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => onSend(s)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground/90 transition-colors hover:bg-accent"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ),
            )
          )}
          {loading ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
            </div>
          ) : null}
        </div>
      )}

      {!historyOpen ? (
        <div className="p-3">
          <AssistantInput onSend={onSend} disabled={loading} />
        </div>
      ) : null}
    </aside>
  );
}
