import { FileAudio, FileImage, FileText, FileVideo, Sparkles } from "lucide-react";
import type { NodeKind } from "../../lib/constants";
import { QuickStartButton } from "../shared/quick-start-button";

export function CanvasEmptyState({ onAddNode }: { onAddNode: (kind: NodeKind) => void }) {
  return (
    <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card/40 text-teal-400 shadow-xl backdrop-blur-md">
        <Sparkles className="size-7 stroke-[1.5]" />
      </div>

      <h2 className="mt-4 text-lg font-semibold text-foreground">Infinite AI Studio Canvas</h2>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Connect multimodal prompt nodes, generate imagery, generate videos, and compose audio workflows.
      </p>

      <div className="pointer-events-auto mt-6 flex flex-wrap justify-center gap-2">
        <QuickStartButton icon={FileText} label="Text Node" onClick={() => onAddNode("text")} />
        <QuickStartButton icon={FileImage} label="Image Generator" onClick={() => onAddNode("image")} />
        <QuickStartButton icon={FileVideo} label="Video Generator" onClick={() => onAddNode("video")} />
        <QuickStartButton icon={FileAudio} label="Audio Synthesizer" onClick={() => onAddNode("audio")} />
      </div>
    </div>
  );
}
