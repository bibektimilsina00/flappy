import { BRAND } from "./content";

/** Onset logo mark — a teal squircle with a two-tone "flow" chevron (motion + flow). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#14b8a6" />
      <path d="M9.5 10.5 16 16 9.5 21.5" fill="none" stroke="#03120f" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <path d="M16 10.5 22.5 16 16 21.5" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
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
