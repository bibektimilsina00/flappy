import { BRAND } from "./content";

/** Flappy logo mark — a teal squircle with a bird in mid-flap, wings up. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#14b8a6" />
      <path d="M5.5 16.5 C9.5 13 12.5 14.5 16 20 C19.5 14.5 22.5 13 26.5 16.5" fill="none" stroke="#ffffff" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className="size-8" />
      {!compact ? <span className="text-[17px] font-bold tracking-tight text-mk-fg">{BRAND.name}</span> : null}
    </span>
  );
}
