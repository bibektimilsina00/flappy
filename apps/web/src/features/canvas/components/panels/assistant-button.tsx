import { WandSparkles } from "lucide-react";

export function AssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="AI Assistant"
      className="group relative grid size-12 place-items-center rounded-full bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30 ring-1 ring-white/25 transition-transform duration-200 hover:scale-105 active:scale-95"
    >
      {/* soft aura that swells on hover */}
      <span className="pointer-events-none absolute -inset-1 -z-10 rounded-full bg-teal-400/40 opacity-50 blur-md transition-opacity duration-300 group-hover:opacity-100" />
      <WandSparkles className="size-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-rotate-12" />
      {/* twinkle */}
      <span className="absolute right-2 top-2 size-1.5 animate-pulse rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.6)]" />
    </button>
  );
}
