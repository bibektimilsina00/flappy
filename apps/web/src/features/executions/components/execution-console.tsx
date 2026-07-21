"use client";

import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { ExecutionEvent, RunStatus } from "../types";

interface ExecutionConsoleProps {
  logs: ExecutionEvent[];
  status: RunStatus;
  error?: string | null;
  onClose: () => void;
}

export function ExecutionConsole({ logs, status, error, onClose }: ExecutionConsoleProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex h-56 flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {status === "running" ? <Loader2 className="size-4 animate-spin text-sky-400" /> : null}
          {status === "completed" ? <CheckCircle2 className="size-4 text-emerald-500" /> : null}
          {status === "failed" ? <XCircle className="size-4 text-destructive" /> : null}
          <span className="capitalize">Run · {status}</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs">
        {logs.map((event, i) => (
          <LogLine key={i} event={event} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function LogLine({ event }: { event: ExecutionEvent }) {
  const time = event.ts.slice(11, 19);
  const label = event.node_id ?? "•";
  const text = event.message ?? event.event;
  const color = event.event.endsWith("failed")
    ? "text-destructive"
    : event.event.endsWith("succeeded") || event.event === "execution.completed"
      ? "text-emerald-400"
      : "text-muted-foreground";

  return (
    <div className={cn("py-0.5", color)}>
      <span className="text-muted-foreground/40">{time}</span>{" "}
      <span className="text-foreground/60">[{label}]</span> {text}
    </div>
  );
}
