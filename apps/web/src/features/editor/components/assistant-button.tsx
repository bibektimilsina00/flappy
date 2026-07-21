import { Sparkles } from "lucide-react";

export function AssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="AI Assistant"
      className="grid size-11 place-items-center rounded-full border border-border bg-card/60 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-accent"
    >
      <Sparkles className="size-5" />
    </button>
  );
}
