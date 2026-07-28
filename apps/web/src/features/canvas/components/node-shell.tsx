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
import { NODE_CONFIG, type NodeConfig, type NodeKind } from "../constants";
import { useNodeStatus } from "../execution-status";
import { NodeHandles } from "./node-handles";
import { NodeToolbar } from "./node-toolbar";
import { PromptBar } from "./prompt-bar";

// A spinning square conic gradient with a short green arc; whatever rounded
// container clips it turns the arc into a highlight that rides the border.
const BEAM =
  "absolute left-1/2 top-1/2 aspect-square w-[170%] -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_110deg,#22c55e_150deg,#86efac_170deg,transparent_190deg,transparent_290deg,#22c55e_330deg,#86efac_350deg,transparent_360deg)]";

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
  // Render the body edge-to-edge (no padding, clipped to the border) — for media.
  flush?: boolean;
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
  flush,
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
      {content && !upload && status !== "running" ? (
        <div
          className={cn(
            // Hide is delayed (300ms) so there's time to cross the gap onto the
            // toolbar; show is instant. Hovering the toolbar re-triggers group-hover.
            "absolute bottom-full left-1/2 z-[80] -translate-x-1/2 pb-3 transition-opacity duration-150",
            selected
              ? "opacity-100"
              : "pointer-events-none opacity-0 delay-300 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:delay-0",
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

      {status === "running" ? (
        // Border beam: a green highlight rides around the perimeter. The spinning
        // conic sits in a 1.5px ring; the inner bg-card masks all but the border.
        // A blurred copy behind adds the soft outward glow.
        <div className="relative rounded-lg p-[1.5px]">
          {/* soft glow bleeding outward from the border */}
          <div className="pointer-events-none absolute -inset-0.5 overflow-hidden rounded-lg opacity-60 blur-sm">
            <div className={BEAM} />
          </div>
          {/* crisp light riding the border */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
            <div className={BEAM} />
          </div>
          <div className="relative rounded-[7px] bg-card p-4">
            <NodeGeneratingOverlay icon={Icon} />
            <NodeHandles icon={Icon} inputs={config.inputs} outputs={config.outputs} />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative rounded-lg border bg-card transition-colors",
            status === "failed" ? "border-destructive/40" : selected ? "border-white/70" : "border-border",
            bodyClassName,
          )}
        >
          {upload ? (
            <div className="p-4">
              <NodeUploadOverlay upload={upload} />
            </div>
          ) : status === "failed" ? (
            <div className="p-4">
              <NodeErrorOverlay />
            </div>
          ) : flush ? (
            <div className="overflow-hidden rounded-[7px]">{children}</div>
          ) : (
            <div className="p-4">{children}</div>
          )}
          <NodeHandles icon={Icon} inputs={config.inputs} outputs={config.outputs} />
        </div>
      )}

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

const PHRASES = [
  "Cooking",
  "Brewing",
  "Conjuring",
  "Percolating",
  "Noodling",
  "Simmering",
  "Composing",
  "Weaving pixels",
  "Manifesting",
  "Crafting",
  "Dreaming it up",
  "Summoning",
  "Marinating",
  "Warming up",
  "Almost there",
];

function NodeGeneratingOverlay({ icon: Icon }: { icon: LucideIcon }) {
  const start = useRef(Date.now());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2800);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.floor((Date.now() - start.current) / 1000);
  // Mostly playful words; every third beat show elapsed time.
  const msg = tick % 3 === 2 ? `${elapsed}s elapsed…` : `${PHRASES[tick % PHRASES.length]}…`;

  return (
    <div className="grid min-h-[240px] place-items-center gap-4">
      <Icon className="size-10 text-muted-foreground/50" strokeWidth={1.25} />
      <span key={msg} className="animate-in fade-in-0 text-sm text-muted-foreground duration-700">
        {msg}
      </span>
    </div>
  );
}

function NodeErrorOverlay() {
  return (
    <div className="grid min-h-[200px] place-items-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <CircleAlert className="size-9 text-destructive" strokeWidth={1.5} />
        <span className="flex items-center gap-1.5 text-sm text-destructive">
          Generation failed <Info className="size-3.5 opacity-70" />
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof useNodeStatus> }) {
  if (!status || status === "running") return null; // running shown by the border beam
  if (status === "succeeded") return <CheckCircle2 className="size-3.5 text-emerald-500" />;
  if (status === "failed") return <XCircle className="size-3.5 text-destructive" />;
  return <MinusCircle className="size-3.5 text-muted-foreground" />;
}
