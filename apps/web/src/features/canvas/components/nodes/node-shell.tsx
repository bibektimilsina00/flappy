import {
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  type LucideIcon,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { NODE_CONFIG, type NodeConfig, type NodeKind } from "../../lib/constants";
import { useNodeStatus } from "../execution-status";
import { NodeHandles } from "./node-handles";
import { NodeToolbar } from "./node-toolbar";
import { PromptBar } from "../toolbar/prompt-bar/prompt-bar";

const BEAM =
  "pointer-events-none absolute -inset-24 animate-[spin_3.5s_linear_infinite] opacity-90 [background:conic-gradient(from_0deg,transparent_0deg,transparent_310deg,#14b8a6_335deg,transparent_360deg)]";

interface NodeShellProps {
  id: string;
  kind: NodeKind;
  selected: boolean;
  locked: boolean;
  data: Record<string, unknown>;
  content?: string;
  flush?: boolean;
  showPromptBar?: boolean;
  children: ReactNode;
}

export function NodeShell({
  id,
  kind,
  selected,
  locked,
  data,
  content,
  flush,
  showPromptBar = true,
  children,
}: NodeShellProps) {
  const status = useNodeStatus(id);
  const isRunning = status === "running";
  const cfg: NodeConfig = NODE_CONFIG[kind];
  const Icon = cfg.icon;

  const [expandedErr, setExpandedErr] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expandedErr) return;
    const onDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setExpandedErr(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [expandedErr]);

  const style = cfg.width ? { width: cfg.width } : undefined;

  return (
    <div
      ref={cardRef}
      style={style}
      className={cn(
        "group relative rounded-2xl transition-shadow",
        kind === "video" ? "w-[520px]" : kind === "audio" ? "w-[380px]" : "w-[288px]",
        selected && "z-20",
      )}
    >
      {isRunning ? <div className="absolute inset-0 overflow-hidden rounded-2xl"><div className={BEAM} /></div> : null}

      <div
        className={cn(
          "relative flex flex-col rounded-2xl border bg-card/95 backdrop-blur-md transition-colors",
          selected
            ? "border-foreground/50 shadow-xl shadow-black/20"
            : "border-border shadow-sm hover:border-muted-foreground/40",
          isRunning && "border-transparent bg-card/98",
        )}
      >
        <NodeHandles kind={kind} />
        <NodeToolbar id={id} kind={kind} content={content ?? undefined} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg bg-secondary text-foreground">
              <Icon className="size-3.5" />
            </span>
            <span className="text-xs font-semibold">{cfg.title}</span>
          </div>

          <StatusIndicator status={status} onToggleExpand={() => setExpandedErr((e) => !e)} />
        </div>

        {/* Content */}
        <div className={cn("relative flex-1", !flush && "p-1")}>{children}</div>

        {/* Prompt bar */}
        {showPromptBar ? (
          <PromptBar
            nodeId={id}
            kind={kind}
            model={data.model as string | undefined}
            params={data.params as Record<string, unknown> | undefined}
            prompt={data.prompt as string | undefined}
          />
        ) : null}
      </div>
    </div>
  );
}

function StatusIndicator({
  status,
  onToggleExpand,
}: {
  status?: string;
  onToggleExpand: () => void;
}) {
  if (!status || status === "idle") return null;

  if (status === "running") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#14b8a6]">
        <Loader2 className="size-3.5 animate-spin" /> Generating…
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span className="flex items-center gap-1 text-xs text-[#14b8a6]">
        <CheckCircle2 className="size-3.5" /> Done
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex items-center gap-1 text-xs text-destructive hover:underline"
      >
        <XCircle className="size-3.5" /> Error
      </button>
    );
  }

  return null;
}
