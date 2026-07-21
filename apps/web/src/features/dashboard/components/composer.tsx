import { ArrowUp, type LucideIcon, Mic, Paperclip, Plus, Slash } from "lucide-react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function Composer({ value, onChange, onSubmit, placeholder }: ComposerProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        rows={2}
        className="min-h-16 w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-muted-foreground">
          <ToolButton icon={Plus} label="Add" />
          <ToolButton icon={Paperclip} label="Attach" />
          <ToolButton icon={Slash} label="Commands" />
        </div>
        <div className="flex items-center gap-1">
          <ToolButton icon={Mic} label="Voice" />
          <button
            onClick={onSubmit}
            aria-label="Send"
            className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      aria-label={label}
      className="rounded-md p-1.5 hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}
