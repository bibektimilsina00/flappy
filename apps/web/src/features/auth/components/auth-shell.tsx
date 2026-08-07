"use client";

import Link from "next/link";

// Shared auth backdrop: the two faint side panels, the #1e1e22 halo, and one teal
// glow snaking between the panels (one lit at a time). Wraps the Clerk widget.
const PANEL = "M1130 150 L1500 150 L1500 800 L945 800 L945 420 Z";
// ONE snake path: left panel's card-facing edges → off-screen bridge → right panel's
// edges → off-screen bridge → loop, so exactly one panel glows at a time.
const SNAKE =
  "M-60 150 L310 150 L495 420 L495 800 L-60 800 L-60 950 L1500 950 L1500 800 L945 800 L945 420 L1130 150 L1500 150 L1500 -100 L-60 -100 Z";
const FLIP = "matrix(-1 0 0 1 1440 0)";

const LINKS: [string, string][] = [
  ["Support", "mailto:hello@riocut.com"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
];

function EdgeGlow({ d }: { d: string }) {
  return (
    <>
      <path
        className="login-trace"
        d={d}
        fill="none"
        stroke="#14b8a6"
        strokeWidth="4.5"
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="10 990"
        filter="url(#edgeGlow)"
      />
      <path
        className="login-trace"
        d={d}
        fill="none"
        stroke="#7df0e0"
        strokeWidth="1.4"
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="10 990"
      />
    </>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark relative flex min-h-dvh flex-col items-center overflow-hidden bg-[#1b1b1f] px-4 py-6 text-foreground">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="halo" cx="50%" cy="47%" r="46%">
            <stop offset="0" stopColor="#1e1e22" stopOpacity="1" />
            <stop offset="1" stopColor="#1e1e22" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="panelFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e1e22" stopOpacity="1" />
            <stop offset="1" stopColor="#1e1e22" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="fade" cx="50%" cy="44%" r="60%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="0.6" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <mask id="fadeMask">
            <rect width="1440" height="900" fill="url(#fade)" />
          </mask>
          <filter id="edgeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <rect width="1440" height="900" fill="url(#halo)" />
        <g mask="url(#fadeMask)">
          <path d={PANEL} fill="url(#panelFill)" stroke="#ffffff" strokeOpacity="0.06" />
          <path d={PANEL} fill="url(#panelFill)" stroke="#ffffff" strokeOpacity="0.06" transform={FLIP} />
        </g>
        <EdgeGlow d={SNAKE} />
      </svg>

      <div className="relative z-10 flex w-full max-w-[25rem] flex-1 flex-col justify-center gap-y-6">
        <main className="grid flex-1 content-center">{children}</main>

        <footer className="flex items-center justify-between text-sm text-white/40">
          <span>© 2026 Riocut</span>
          <ul className="flex items-center gap-2.5">
            {LINKS.map(([label, href], i) => (
              <li key={label} className="flex items-center gap-2.5">
                {href.startsWith("mailto:") ? (
                  <a href={href} className="transition-colors hover:text-white/70">
                    {label}
                  </a>
                ) : (
                  <Link href={href} className="transition-colors hover:text-white/70">
                    {label}
                  </Link>
                )}
                {i < LINKS.length - 1 ? <span className="text-white/20">·</span> : null}
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
}
