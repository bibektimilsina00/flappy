import { Hand, MousePointer, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/cn";

export type CanvasTool = "select" | "hand";

interface CanvasControlsProps {
  tool: CanvasTool;
  zoom: number;
  onToolChange: (tool: CanvasTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export function CanvasControls({
  tool,
  zoom,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onFitView,
}: CanvasControlsProps) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-40 flex items-center gap-1">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-[#18181b]/90 p-1.5 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          title="Select tool (V)"
          onClick={() => onToolChange("select")}
          className={cn(
            "flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-white/10 hover:text-white",
            tool === "select" && "bg-white/15 text-white",
          )}
        >
          <MousePointer className="size-4" />
        </button>

        <button
          type="button"
          title="Hand tool (H)"
          onClick={() => onToolChange("hand")}
          className={cn(
            "flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-white/10 hover:text-white",
            tool === "hand" && "bg-white/15 text-white",
          )}
        >
          <Hand className="size-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-white/10" />

        <button
          type="button"
          title="Zoom out"
          onClick={onZoomOut}
          className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-white/10 hover:text-white"
        >
          <ZoomOut className="size-4" />
        </button>

        <button
          type="button"
          title="Fit view"
          onClick={onFitView}
          className="flex px-2 py-1 items-center justify-center text-xs font-mono font-medium text-muted-foreground transition-all hover:bg-white/10 hover:text-white"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          title="Zoom in"
          onClick={onZoomIn}
          className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-white/10 hover:text-white"
        >
          <ZoomIn className="size-4" />
        </button>
      </div>
    </div>
  );
}
