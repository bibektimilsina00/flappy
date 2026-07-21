import { CheckCircle2, Loader2, MinusCircle, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { NODE_CONFIG, type NodeConfig, type NodeKind } from "../constants";
import { useNodeStatus } from "../execution-status";
import { NodeHandles } from "./node-handles";
import { NodeToolbar } from "./node-toolbar";
import { PromptBar } from "./prompt-bar";

interface NodeShellProps {
  id: string;
  kind: NodeKind;
  selected: boolean;
  locked: boolean;
  data?: Record<string, unknown>;
  showPromptBar?: boolean;
  bodyClassName?: string;
  // Present only when the node has produced/holds content (media URL or text).
  // Gates the floating action toolbar.
  content?: string;
  children: ReactNode;
}

// Common frame shared by every node type: header, box, toolbar, ports, and
// the selected-state prompt bar. Per-type components supply the body.
export function NodeShell({
  id,
  kind,
  selected,
  data,
  showPromptBar = true,
  bodyClassName,
  content,
  children,
}: NodeShellProps) {
  const config: NodeConfig = NODE_CONFIG[kind];
  const Icon = config.icon;
  const status = useNodeStatus(id);
  const upload = (data as { upload?: UploadState } | undefined)?.upload;
  const label = (data as { label?: string } | undefined)?.label;

  return (
    <div className="group relative" style={{ width: config.width ?? 288 }}>
      {/* Floating action toolbar — only when the node has content, on hover/select */}
      {content && !upload ? (
        <div
          className={cn(
            "absolute bottom-full left-1/2 z-[80] mb-3 -translate-x-1/2 transition-opacity",
            selected
              ? "opacity-100"
              : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
          )}
        >
          <NodeToolbar id={id} kind={kind} content={content} label={label} />
        </div>
      ) : null}

      <div className="mb-1.5 flex items-center gap-1.5 px-1 text-sm font-medium">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{label ?? config.title}</span>
        <StatusBadge status={status} />
      </div>

      <div
        className={cn(
          "relative rounded-lg border bg-card p-4 transition-colors",
          selected ? "border-white/70" : "border-border",
          bodyClassName,
        )}
      >
        {upload ? <NodeUploadOverlay upload={upload} /> : children}
        <NodeHandles icon={Icon} inputs={config.inputs} outputs={config.outputs} />
      </div>

      {selected && showPromptBar && !upload ? (
        <div className="nodrag nowheel absolute left-1/2 top-full z-[70] mt-3 w-[720px] -translate-x-1/2">
          <PromptBar
            nodeId={id}
            kind={kind}
            model={data?.model as string | undefined}
            params={data?.params as Record<string, unknown> | undefined}
            prompt={data?.prompt as string | undefined}
          />
        </div>
      ) : null}
    </div>
  );
}

interface UploadState {
  name: string;
  progress: number;
}

// Uploading placeholder — same look for every node kind: an empty media body
// with a filename + progress bar pinned to the bottom.
function NodeUploadOverlay({ upload }: { upload: UploadState }) {
  return (
    <div className="flex min-h-[320px] flex-col">
      <div className="flex-1" />
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
            <span className="truncate">{upload.name}</span>
          </span>
          <span className="shrink-0 text-muted-foreground">{upload.progress}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-200"
            style={{ width: `${upload.progress}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Creating canvas node</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof useNodeStatus> }) {
  if (!status) return null;
  if (status === "running")
    return <Loader2 className="size-3.5 animate-spin text-sky-400" />;
  if (status === "succeeded") return <CheckCircle2 className="size-3.5 text-emerald-500" />;
  if (status === "failed") return <XCircle className="size-3.5 text-destructive" />;
  return <MinusCircle className="size-3.5 text-muted-foreground" />;
}
