import { BRAND } from "./content";

/** Kinomill logo mark — a teal squircle with a mill wheel that doubles as a
 * film reel: rim, four spokes, hub. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#14b8a6" />
      <g stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <circle cx="16" cy="16" r="8.2" />
        <path d="M16 10.2 V13.4 M16 18.6 V21.8 M10.2 16 H13.4 M18.6 16 H21.8" />
      </g>
      <circle cx="16" cy="16" r="2.1" fill="#ffffff" />
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
