import { History, Plus, X } from "lucide-react";
import { AssistantInput } from "./assistant-input";

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">New Chat</span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <button aria-label="New chat" className="rounded p-1 hover:text-foreground">
            <Plus className="size-4" />
          </button>
          <button aria-label="History" className="rounded p-1 hover:text-foreground">
            <History className="size-4" />
          </button>
          <button aria-label="Close" onClick={onClose} className="rounded p-1 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Ask the assistant to build or edit your video.
      </div>

      <div className="p-3">
        <AssistantInput />
      </div>
    </aside>
  );
}
