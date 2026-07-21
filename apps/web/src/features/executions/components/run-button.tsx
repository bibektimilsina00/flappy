import { Loader2, Play } from "lucide-react";

interface RunButtonProps {
  onClick: () => void;
  running: boolean;
  disabled?: boolean;
}

export function RunButton({ onClick, running, disabled }: RunButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || running}
      className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-60"
    >
      {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
      {running ? "Running…" : "Run"}
    </button>
  );
}
