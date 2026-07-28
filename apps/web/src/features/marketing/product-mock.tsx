import { ArrowUp, Clapperboard, Component, Image as ImageIcon, Sparkles, Video } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A stylized, self-contained mock of the product (node canvas + magnetic timeline).
 * Pure CSS/SVG, flat colours — reads as a clean product screenshot placeholder.
 */
export function ProductMock({ className }: { className?: string }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-2xl border border-mk-border bg-mk-surface", className)}>
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-mk-border bg-mk-surface2 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <div className="ml-3 flex items-center gap-1 rounded-md bg-mk-bg px-2 py-1 text-[11px] text-mk-faint">
          <Component className="size-3 text-mk-accent" /> Untitled project · Canvas
        </div>
      </div>

      {/* canvas */}
      <div className="relative h-[300px] bg-mk-bg mk-bg-grid sm:h-[340px]">
        <svg className="absolute inset-0 size-full" aria-hidden="true" focusable="false">
          <path d="M172 96 C 240 96, 240 150, 300 150" fill="none" stroke="rgba(20,184,166,0.55)" strokeWidth="2" />
          <path d="M420 150 C 480 150, 480 210, 540 210" fill="none" stroke="rgba(20,184,166,0.55)" strokeWidth="2" />
        </svg>

        <NodeCard className="left-6 top-10 w-40" icon={<Sparkles className="size-3.5" />} title="Prompt">
          <p className="line-clamp-2 text-[11px] leading-snug text-mk-muted">Drone shot over neon Tokyo at night, cinematic…</p>
        </NodeCard>

        <NodeCard className="left-[300px] top-[118px] w-32" icon={<ImageIcon className="size-3.5" />} title="Image">
          <div className="h-12 rounded-md bg-mk-surface2" />
        </NodeCard>

        <NodeCard className="right-6 top-[178px] w-36" icon={<Video className="size-3.5" />} title="Video" running>
          <div className="h-12 rounded-md bg-mk-accent/25" />
        </NodeCard>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-mk-border bg-mk-surface px-2 py-1.5">
          <span className="px-2 text-[11px] text-mk-muted">Google Veo · 1080p</span>
          <span className="grid size-6 place-items-center rounded-full bg-mk-accent text-mk-accentfg">
            <ArrowUp className="size-3.5" />
          </span>
        </div>
      </div>

      {/* timeline */}
      <div className="border-t border-mk-border bg-mk-surface2">
        <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-mk-faint">
          <Clapperboard className="size-3.5 text-mk-accent" /> Timeline
          <span className="ml-auto tabular-nums">00:12 / 00:30</span>
        </div>
        <div className="relative px-4 pb-4">
          <div className="mb-1 flex justify-between text-[9px] tabular-nums text-mk-faint">
            {["00", "05", "10", "15", "20", "25"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="space-y-1.5">
            <TimelineRow>
              <Clip className="left-0 w-[34%] bg-mk-accent/80" label="shot 01" />
              <Clip className="left-[34%] w-[30%] bg-mk-accent/50" label="shot 02" />
              <Clip className="left-[64%] w-[36%] bg-mk-accent/80" label="shot 03" />
            </TimelineRow>
            <TimelineRow>
              <Clip className="left-[10%] w-[45%] bg-mk-surface ring-1 ring-mk-border" label="captions" muted />
            </TimelineRow>
            <TimelineRow>
              <Clip className="left-0 w-full bg-mk-surface ring-1 ring-mk-border" label="music" muted />
            </TimelineRow>
          </div>
          <div className="pointer-events-none absolute inset-y-2 left-[40%] w-px bg-mk-accent">
            <span className="absolute -left-[3px] top-0 size-1.5 rounded-sm bg-mk-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeCard({ className, icon, title, running, children }: { className?: string; icon: React.ReactNode; title: string; running?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("absolute rounded-xl border border-mk-borders bg-mk-surface p-2.5 shadow-lg", className)}>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-mk-fg">
        <span className="text-mk-accent">{icon}</span>
        {title}
        {running ? <span className="ml-auto size-1.5 animate-pulse rounded-full bg-mk-accent" /> : null}
      </div>
      {children}
    </div>
  );
}

function TimelineRow({ children }: { children: React.ReactNode }) {
  return <div className="relative h-7 rounded-md bg-mk-bg">{children}</div>;
}

function Clip({ className, label, muted }: { className?: string; label: string; muted?: boolean }) {
  return (
    <div className={cn("absolute inset-y-0 flex items-center overflow-hidden rounded-md px-2", className)}>
      <span className={cn("truncate text-[9px] font-medium", muted ? "text-mk-muted" : "text-mk-accentfg")}>{label}</span>
    </div>
  );
}
