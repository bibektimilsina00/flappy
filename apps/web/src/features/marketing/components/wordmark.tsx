import { BRAND } from "../lib/content";

/** Riocut logo mark — a play button sliced in two: video, cut. The right
 * piece drifts down-stream (the rio). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#14b8a6" />
      <g fill="#ffffff" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M11.5 9.8 V22.2 L16.9 19.3 V12.7 Z" />
        <path d="M19.3 14.2 V20.2 L24.6 17.2 Z" />
      </g>
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
